import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AnimalStatus, Prisma } from '@prisma/client';

import type { AuthUser } from '../common/types';
import {
  loadFirstRecordDateMap,
  resolveFosterDaysForAnimal,
} from '../domain/foster/application/foster-days';
import {
  toAnimalListItem,
  toFosterRecordAnimalMeta,
  toFosterRecordBase,
} from '../domain/foster/application/mappers';
import type {
  AnimalListItem,
  DeleteAnimalResult,
  DeleteRecordResult,
  FosterRecordBase,
  FosterRecordDetail,
  ListAnimalsResult,
  ListRecordsResult,
} from '../domain/foster/application/types';
import { parseAnimalStatus } from '../domain/foster/domain/animals';
import { calculateFosterDays } from '../domain/foster/domain/metrics';
import { ensureAnimalWriteAccess } from '../domain/foster/domain/permissions';
import {
  resolveRecordWindow,
  toImageCreateInputs,
} from '../domain/foster/domain/records';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FosterService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnimals(status?: string): Promise<ListAnimalsResult> {
    const statusValue = this.parseStatus(status);
    const where = statusValue ? { status: statusValue } : {};
    return this.listAnimalsWith(where);
  }

  async listSharedAnimals(): Promise<ListAnimalsResult> {
    return this.listAnimalsWith({ shared: true });
  }

  async createAnimal(
    user: AuthUser,
    dto: { name: string; orgId?: string; shared?: boolean },
  ): Promise<AnimalListItem> {
    if (dto.orgId && user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('animal-org-only');
    }

    const created = await this.prisma.animal.create({
      data: dto.orgId
        ? { name: dto.name, orgId: dto.orgId, shared: dto.shared ?? false }
        : {
            name: dto.name,
            ownerUserId: user.userId,
            shared: dto.shared ?? false,
          },
    });
    return toAnimalListItem(created, 0);
  }

  async updateAnimal(
    id: string,
    user: AuthUser,
    dto: { name?: string; shared?: boolean; status?: string },
  ): Promise<AnimalListItem> {
    await this.ensureWritableAnimal(id, user);
    const statusValue = this.parseStatus(dto.status);

    const updated = await this.prisma.animal.update({
      where: { id },
      data: {
        name: dto.name,
        shared: dto.shared,
        status: statusValue ?? undefined,
      },
    });
    const fosterDays = await this.computeFosterDays(updated.id, updated.createdAt);
    return toAnimalListItem(updated, fosterDays);
  }

  async deleteAnimal(id: string, user: AuthUser): Promise<DeleteAnimalResult> {
    await this.ensureWritableAnimal(id, user);
    await this.prisma.animal.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listRecords(
    animalId: string,
    from?: string,
    to?: string,
  ): Promise<ListRecordsResult> {
    const window = resolveRecordWindow(from, to);
    if ('status' in window) {
      throw new BadRequestException(window.reason);
    }

    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!animal) {
      throw new NotFoundException('animal-not-found');
    }
    const animalMeta = toFosterRecordAnimalMeta(animal);

    const items = await this.prisma.fosterRecord.findMany({
      where: { animalId, date: { gte: window.from, lte: window.to } },
      orderBy: { date: 'asc' },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    const mappedItems = items.map((record) => toFosterRecordBase(record, record.images));
    return {
      animalId,
      animal: animalMeta,
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      items: mappedItems,
    };
  }

  async getRecord(animalId: string, recordId: string): Promise<FosterRecordDetail> {
    const record = await this.prisma.fosterRecord.findUnique({
      where: { id: recordId },
      include: { images: true },
    });
    if (!record || record.animalId !== animalId) {
      throw new NotFoundException('record-not-found');
    }
    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!animal) {
      throw new NotFoundException('animal-not-found');
    }
    const base = toFosterRecordBase(record, record.images);
    return { ...base, animal: toFosterRecordAnimalMeta(animal) };
  }

  async createRecord(
    animalId: string,
    user: AuthUser,
    dto: { date: string; content?: string; images?: string[] },
  ): Promise<FosterRecordBase> {
    await this.ensureWritableAnimal(animalId, user);

    const images = toImageCreateInputs(dto.images);
    const created = await this.prisma.fosterRecord.create({
      data: {
        animalId,
        date: new Date(dto.date),
        content: dto.content,
        images: images.length
          ? {
              create: images.map((image) => ({
                url: image.url,
                sortOrder: image.sortOrder,
              })),
            }
          : undefined,
      },
      include: { images: true },
    });
    return toFosterRecordBase(created, created.images);
  }

  async updateRecord(
    animalId: string,
    recordId: string,
    user: AuthUser,
    dto: { date?: string; content?: string; images?: string[] },
  ): Promise<FosterRecordBase> {
    const record = await this.prisma.fosterRecord.findUnique({
      where: { id: recordId },
    });
    if (!record || record.animalId !== animalId) {
      throw new NotFoundException('record-not-found');
    }

    await this.ensureWritableAnimal(animalId, user);

    const hasImagePayload = dto.images !== undefined;
    const images = toImageCreateInputs(dto.images);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fosterRecord.update({
        where: { id: recordId },
        data: {
          content: dto.content,
          date: dto.date ? new Date(dto.date) : undefined,
        },
      });

      if (hasImagePayload) {
        await tx.fosterRecordImage.deleteMany({ where: { recordId } });
        if (images.length > 0) {
          await tx.fosterRecordImage.createMany({
            data: images.map((image) => ({
              recordId,
              url: image.url,
              sortOrder: image.sortOrder,
            })),
          });
        }
      }
      const currentImages = await tx.fosterRecordImage.findMany({
        where: { recordId },
        orderBy: { sortOrder: 'asc' },
      });
      return toFosterRecordBase(updated, currentImages);
    });
  }

  async deleteRecord(
    animalId: string,
    recordId: string,
    user: AuthUser,
  ): Promise<DeleteRecordResult> {
    const record = await this.prisma.fosterRecord.findUnique({
      where: { id: recordId },
    });
    if (!record || record.animalId !== animalId) {
      throw new NotFoundException('record-not-found');
    }

    await this.ensureWritableAnimal(animalId, user);

    await this.prisma.fosterRecord.delete({ where: { id: recordId } });
    return { animalId, id: recordId, deleted: true };
  }

  private parseStatus(status?: string): AnimalStatus | undefined {
    const result = parseAnimalStatus(status);
    if (result.status === 'error') {
      throw new BadRequestException(result.reason);
    }
    return result.value;
  }

  private async ensureWritableAnimal(animalId: string, user: AuthUser): Promise<void> {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    const access = ensureAnimalWriteAccess(animal, user);
    if (access.status === 'error') {
      if (access.reason === 'animal-not-found') {
        throw new NotFoundException(access.reason);
      }
      throw new ForbiddenException(access.reason);
    }
  }

  private async computeFosterDays(
    animalId: string,
    createdAt: Date,
    now: Date = new Date(),
  ): Promise<number> {
    return resolveFosterDaysForAnimal(this.prisma.fosterRecord, {
      animalId,
      fallbackCreatedAt: createdAt,
      now,
    });
  }

  private async listAnimalsWith(
    where: Prisma.AnimalWhereInput,
  ): Promise<ListAnimalsResult> {
    const animals = await this.prisma.animal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const firstRecordMap = await loadFirstRecordDateMap(
      this.prisma.fosterRecord,
      animals.map((animal) => animal.id),
    );
    const items = animals.map((animal) => {
      const firstRecordDate = firstRecordMap.get(animal.id) ?? null;
      const fosterDays = calculateFosterDays({
        now,
        firstRecordDate,
        fallbackCreatedAt: animal.createdAt,
      });
      return toAnimalListItem(animal, fosterDays);
    });
    return { items };
  }
}
