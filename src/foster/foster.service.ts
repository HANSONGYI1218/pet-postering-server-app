import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AnimalStatus } from '@prisma/client';

import type { AuthUser } from '../common/types';
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
    const animals = await this.prisma.animal.findMany({
      where: statusValue ? { status: statusValue } : {},
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const items = await Promise.all(
      animals.map(async (animal) => {
        const firstRecord = await this.prisma.fosterRecord.findFirst({
          where: { animalId: animal.id },
          orderBy: { date: 'asc' },
          select: { date: true },
        });
        const fosterDays = calculateFosterDays({
          now,
          firstRecordDate: firstRecord?.date ?? null,
          fallbackCreatedAt: animal.createdAt,
        });
        return { ...animal, fosterDays } satisfies AnimalListItem;
      }),
    );
    return { items };
  }

  async listSharedAnimals(): Promise<ListAnimalsResult> {
    const animals = await this.prisma.animal.findMany({
      where: { shared: true },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const items = await Promise.all(
      animals.map(async (animal) => {
        const firstRecord = await this.prisma.fosterRecord.findFirst({
          where: { animalId: animal.id },
          orderBy: { date: 'asc' },
          select: { date: true },
        });
        const fosterDays = calculateFosterDays({
          now,
          firstRecordDate: firstRecord?.date ?? null,
          fallbackCreatedAt: animal.createdAt,
        });
        return { ...animal, fosterDays } satisfies AnimalListItem;
      }),
    );
    return { items };
  }

  async createAnimal(
    user: AuthUser,
    dto: { name: string; orgId?: string; shared?: boolean },
  ): Promise<AnimalListItem> {
    if (dto.orgId && user.role !== 'ORG_ADMIN')
      throw new ForbiddenException('animal-org-only');

    const created = await this.prisma.animal.create({
      data: dto.orgId
        ? { name: dto.name, orgId: dto.orgId, shared: dto.shared ?? false }
        : {
            name: dto.name,
            ownerUserId: user.userId,
            shared: dto.shared ?? false,
          },
    });
    return { ...created, fosterDays: 0 } satisfies AnimalListItem;
  }

  async updateAnimal(
    id: string,
    user: AuthUser,
    dto: { name?: string; shared?: boolean; status?: string },
  ): Promise<AnimalListItem> {
    this.requireAnimalAccess(
      await this.prisma.animal.findUnique({ where: { id } }),
      user,
    );
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
    return { ...updated, fosterDays } satisfies AnimalListItem;
  }

  async deleteAnimal(id: string, user: AuthUser): Promise<DeleteAnimalResult> {
    this.requireAnimalAccess(
      await this.prisma.animal.findUnique({ where: { id } }),
      user,
    );
    await this.prisma.animal.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listRecords(
    animalId: string,
    from?: string,
    to?: string,
  ): Promise<ListRecordsResult> {
    const window = resolveRecordWindow(from, to);
    if ('status' in window) throw new BadRequestException(window.reason);

    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!animal) throw new NotFoundException('animal-not-found');

    const items = await this.prisma.fosterRecord.findMany({
      where: { animalId, date: { gte: window.from, lte: window.to } },
      orderBy: { date: 'asc' },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    return {
      animalId,
      animal: {
        id: animal.id,
        name: animal.name,
        status: animal.status,
        shared: animal.shared,
        organization: animal.organization ?? null,
      },
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      items,
    };
  }

  async getRecord(animalId: string, recordId: string): Promise<FosterRecordDetail> {
    const record = await this.prisma.fosterRecord.findUnique({
      where: { id: recordId },
      include: { images: true },
    });
    if (!record || record.animalId !== animalId)
      throw new NotFoundException('record-not-found');

    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!animal) return record as FosterRecordBase;
    return {
      ...record,
      animal: {
        id: animal.id,
        name: animal.name,
        status: animal.status,
        shared: animal.shared,
        organization: animal.organization ?? null,
      },
    } satisfies FosterRecordDetail;
  }

  async createRecord(
    animalId: string,
    user: AuthUser,
    dto: { date: string; content?: string; images?: string[] },
  ): Promise<FosterRecordBase> {
    this.requireAnimalAccess(
      await this.prisma.animal.findUnique({ where: { id: animalId } }),
      user,
    );

    const images = toImageCreateInputs(dto.images);
    return this.prisma.fosterRecord.create({
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
    if (!record || record.animalId !== animalId)
      throw new NotFoundException('record-not-found');

    this.requireAnimalAccess(
      await this.prisma.animal.findUnique({ where: { id: animalId } }),
      user,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fosterRecord.update({
        where: { id: recordId },
        data: {
          content: dto.content,
          date: dto.date ? new Date(dto.date) : undefined,
        },
      });
      const images = toImageCreateInputs(dto.images);
      if (images.length > 0) {
        await tx.fosterRecordImage.deleteMany({ where: { recordId } });
        await tx.fosterRecordImage.createMany({
          data: images.map((image) => ({
            recordId,
            url: image.url,
            sortOrder: image.sortOrder,
          })),
        });
      }
      const currentImages = await tx.fosterRecordImage.findMany({
        where: { recordId },
        orderBy: { sortOrder: 'asc' },
      });
      return { ...updated, images: currentImages } satisfies FosterRecordBase;
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
    if (!record || record.animalId !== animalId)
      throw new NotFoundException('record-not-found');

    this.requireAnimalAccess(
      await this.prisma.animal.findUnique({ where: { id: animalId } }),
      user,
    );

    await this.prisma.fosterRecord.delete({ where: { id: recordId } });
    return { animalId, id: recordId, deleted: true };
  }

  private parseStatus(status?: string): AnimalStatus | undefined {
    const result = parseAnimalStatus(status);
    if (result.status === 'error') throw new BadRequestException(result.reason);
    return result.value;
  }

  private requireAnimalAccess<
    T extends { orgId: string | null; ownerUserId: string | null } | null,
  >(animal: T, user: AuthUser): Exclude<T, null> {
    if (!animal) throw new NotFoundException('animal-not-found');
    const access = ensureAnimalWriteAccess(animal, user);
    if (access.status === 'error') {
      if (access.reason === 'animal-not-found')
        throw new NotFoundException(access.reason);
      throw new ForbiddenException(access.reason);
    }
    return animal as Exclude<T, null>;
  }

  private async computeFosterDays(animalId: string, createdAt: Date): Promise<number> {
    const firstRecord = await this.prisma.fosterRecord.findFirst({
      where: { animalId },
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    return calculateFosterDays({
      now: new Date(),
      firstRecordDate: firstRecord?.date ?? null,
      fallbackCreatedAt: createdAt,
    });
  }
}
