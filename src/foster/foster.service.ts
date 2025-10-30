import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AnimalEnvironmentTagType,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSpecialNoteTagType,
  AnimalStatus,
  Prisma,
} from '@prisma/client';

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

  // eslint-disable-next-line max-lines-per-function
  async createAnimal(
    user: AuthUser,
    dto: {
      name: string;
      orgId?: string;
      shared?: boolean;
      status?: string;
      type?: Prisma.AnimalUncheckedCreateInput['type'];
      size?: Prisma.AnimalUncheckedCreateInput['size'];
      gender?: Prisma.AnimalUncheckedCreateInput['gender'];
      breed?: string;
      birthDate?: string;
      introduction?: string;
      remark?: string;
      emergency?: boolean;
      emergencyReason?: string;
      images?: string[];
      healthTags?: AnimalHealthTagType[];
      personalityTags?: AnimalPersonalityTagType[];
      environmentTags?: AnimalEnvironmentTagType[];
      specialNoteTags?: AnimalSpecialNoteTagType[];
      isFosterCondition?: boolean;
      currentFosterStartDate?: string;
      currentFosterEndDate?: string;
    },
  ): Promise<AnimalListItem> {
    if (dto.orgId && user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('animal-org-only');
    }

    const statusValue = this.parseStatus(dto.status);
    const images = this.normalizeImages(dto.images);
    const healthTags = dto.healthTags ?? [];
    const personalityTags = dto.personalityTags ?? [];
    const environmentTags = dto.environmentTags ?? [];
    const specialNoteTags = dto.specialNoteTags ?? [];

    const created = await this.prisma.$transaction(
      // eslint-disable-next-line complexity
      async (tx) => {
        const createdAnimal = await tx.animal.create({
          data: {
            name: dto.name,
            orgId: dto.orgId ?? null,
            ownerUserId: dto.orgId ? null : user.userId,
            shared: dto.shared ?? false,
            status: statusValue ?? undefined,
            type: dto.type ?? undefined,
            size: dto.size ?? undefined,
            gender: dto.gender ?? undefined,
            breed: dto.breed ?? undefined,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            introduction: dto.introduction ?? undefined,
            remark: dto.remark ?? undefined,
            emergency: dto.emergency ?? false,
            emergencyReason: dto.emergencyReason ?? undefined,
            mainImageUrl: images[0] ?? null,
            isFosterCondition: dto.isFosterCondition ?? undefined,
            currentFosterStartDate: dto.currentFosterStartDate
              ? new Date(dto.currentFosterStartDate)
              : undefined,
            currentFosterEndDate: dto.currentFosterEndDate
              ? new Date(dto.currentFosterEndDate)
              : undefined,
          },
        });

        await this.createAnimalImages(tx.animalImage, createdAnimal.id, images);
        await this.createAnimalTags(tx, createdAnimal.id, {
          healthTags,
          personalityTags,
          environmentTags,
          specialNoteTags,
        });

        return createdAnimal;
      },
    );
    return toAnimalListItem(created, 0);
  }

  // eslint-disable-next-line max-lines-per-function
  async updateAnimal(
    id: string,
    user: AuthUser,
    dto: {
      name?: string;
      shared?: boolean;
      status?: string;
      type?: Prisma.AnimalUncheckedUpdateInput['type'];
      size?: Prisma.AnimalUncheckedUpdateInput['size'];
      gender?: Prisma.AnimalUncheckedUpdateInput['gender'];
      breed?: string;
      birthDate?: string;
      introduction?: string;
      remark?: string;
      emergency?: boolean;
      emergencyReason?: string;
      images?: string[];
      healthTags?: AnimalHealthTagType[];
      personalityTags?: AnimalPersonalityTagType[];
      environmentTags?: AnimalEnvironmentTagType[];
      specialNoteTags?: AnimalSpecialNoteTagType[];
      isFosterCondition?: boolean;
      currentFosterStartDate?: string;
      currentFosterEndDate?: string;
    },
  ): Promise<AnimalListItem> {
    await this.ensureWritableAnimal(id, user);
    const statusValue = this.parseStatus(dto.status);

    const images =
      dto.images !== undefined ? this.normalizeImages(dto.images) : undefined;
    const healthTags = dto.healthTags;
    const personalityTags = dto.personalityTags;
    const environmentTags = dto.environmentTags;
    const specialNoteTags = dto.specialNoteTags;

    const updated = await this.prisma.$transaction(
      // eslint-disable-next-line complexity
      async (tx) => {
        const updatedAnimal = await tx.animal.update({
          where: { id },
          data: {
            name: dto.name ?? undefined,
            shared: dto.shared ?? undefined,
            status: statusValue ?? undefined,
            type: dto.type ?? undefined,
            size: dto.size ?? undefined,
            gender: dto.gender ?? undefined,
            breed: dto.breed ?? undefined,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            introduction:
              dto.introduction !== undefined ? dto.introduction || null : undefined,
            remark: dto.remark !== undefined ? dto.remark || null : undefined,
            emergency: dto.emergency ?? undefined,
            emergencyReason:
              dto.emergencyReason !== undefined ? dto.emergencyReason || null : undefined,
            mainImageUrl:
              images !== undefined ? (images.length > 0 ? images[0] : null) : undefined,
            isFosterCondition: dto.isFosterCondition ?? undefined,
            currentFosterStartDate: dto.currentFosterStartDate
              ? new Date(dto.currentFosterStartDate)
              : undefined,
            currentFosterEndDate: dto.currentFosterEndDate
              ? new Date(dto.currentFosterEndDate)
              : undefined,
          },
        });

        if (images !== undefined) {
          await this.replaceAnimalImages(tx.animalImage, id, images);
        }
        await this.replaceAnimalTags(tx, id, {
          healthTags,
          personalityTags,
          environmentTags,
          specialNoteTags,
        });

        return updatedAnimal;
      },
    );
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
    dto: { date: string; content?: string; healthNote?: string; images?: string[] },
  ): Promise<FosterRecordBase> {
    await this.ensureWritableAnimal(animalId, user);

    const images = toImageCreateInputs(dto.images);
    const created = await this.prisma.fosterRecord.create({
      data: {
        animalId,
        date: new Date(dto.date),
        content: dto.content,
        healthNote: dto.healthNote ?? undefined,
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
    dto: { date?: string; content?: string; healthNote?: string; images?: string[] },
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
          healthNote:
            dto.healthNote !== undefined
              ? dto.healthNote
                ? dto.healthNote
                : null
              : undefined,
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

  private normalizeImages(images?: readonly string[]): string[] {
    if (!images?.length) {
      return [];
    }
    return images
      .map((url) => (typeof url === 'string' ? url.trim() : ''))
      .filter((url) => url.length > 0)
      .slice(0, 10);
  }

  private async createAnimalImages(
    tx: Pick<PrismaService['animalImage'], 'createMany'>,
    animalId: string,
    images: readonly string[],
  ): Promise<void> {
    if (!images.length) {
      return;
    }
    await tx.createMany({
      data: images.map((url, index) => ({
        animalId,
        url,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  private async replaceAnimalImages(
    tx: Pick<PrismaService['animalImage'], 'deleteMany' | 'createMany'>,
    animalId: string,
    images: readonly string[],
  ): Promise<void> {
    await tx.deleteMany({ where: { animalId } });
    if (!images.length) {
      return;
    }
    await tx.createMany({
      data: images.map((url, index) => ({
        animalId,
        url,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  private async createAnimalTags(
    tx: {
      animalHealthTag: Pick<PrismaService['animalHealthTag'], 'createMany'>;
      animalPersonalityTag: Pick<PrismaService['animalPersonalityTag'], 'createMany'>;
      animalEnvironmentTag: Pick<PrismaService['animalEnvironmentTag'], 'createMany'>;
      animalSpecialNoteTag: Pick<PrismaService['animalSpecialNoteTag'], 'createMany'>;
    },
    animalId: string,
    tags: {
      healthTags: readonly AnimalHealthTagType[];
      personalityTags: readonly AnimalPersonalityTagType[];
      environmentTags: readonly AnimalEnvironmentTagType[];
      specialNoteTags: readonly AnimalSpecialNoteTagType[];
    },
  ): Promise<void> {
    if (tags.healthTags.length > 0) {
      await tx.animalHealthTag.createMany({
        data: tags.healthTags.map((value) => ({ animalId, value })),
        skipDuplicates: true,
      });
    }
    if (tags.personalityTags.length > 0) {
      await tx.animalPersonalityTag.createMany({
        data: tags.personalityTags.map((value) => ({ animalId, value })),
        skipDuplicates: true,
      });
    }
    if (tags.environmentTags.length > 0) {
      await tx.animalEnvironmentTag.createMany({
        data: tags.environmentTags.map((value) => ({ animalId, value })),
        skipDuplicates: true,
      });
    }
    if (tags.specialNoteTags.length > 0) {
      await tx.animalSpecialNoteTag.createMany({
        data: tags.specialNoteTags.map((value) => ({ animalId, value })),
        skipDuplicates: true,
      });
    }
  }

  // eslint-disable-next-line max-lines-per-function
  private async replaceAnimalTags(
    tx: {
      animalHealthTag: Pick<
        PrismaService['animalHealthTag'],
        'deleteMany' | 'createMany'
      >;
      animalPersonalityTag: Pick<
        PrismaService['animalPersonalityTag'],
        'deleteMany' | 'createMany'
      >;
      animalEnvironmentTag: Pick<
        PrismaService['animalEnvironmentTag'],
        'deleteMany' | 'createMany'
      >;
      animalSpecialNoteTag: Pick<
        PrismaService['animalSpecialNoteTag'],
        'deleteMany' | 'createMany'
      >;
    },
    animalId: string,
    tags: {
      healthTags?: readonly AnimalHealthTagType[];
      personalityTags?: readonly AnimalPersonalityTagType[];
      environmentTags?: readonly AnimalEnvironmentTagType[];
      specialNoteTags?: readonly AnimalSpecialNoteTagType[];
    },
  ): Promise<void> {
    if (tags.healthTags !== undefined) {
      await tx.animalHealthTag.deleteMany({ where: { animalId } });
      if (tags.healthTags.length > 0) {
        await tx.animalHealthTag.createMany({
          data: tags.healthTags.map((value) => ({ animalId, value })),
          skipDuplicates: true,
        });
      }
    }

    if (tags.personalityTags !== undefined) {
      await tx.animalPersonalityTag.deleteMany({ where: { animalId } });
      if (tags.personalityTags.length > 0) {
        await tx.animalPersonalityTag.createMany({
          data: tags.personalityTags.map((value) => ({ animalId, value })),
          skipDuplicates: true,
        });
      }
    }

    if (tags.environmentTags !== undefined) {
      await tx.animalEnvironmentTag.deleteMany({ where: { animalId } });
      if (tags.environmentTags.length > 0) {
        await tx.animalEnvironmentTag.createMany({
          data: tags.environmentTags.map((value) => ({ animalId, value })),
          skipDuplicates: true,
        });
      }
    }

    if (tags.specialNoteTags !== undefined) {
      await tx.animalSpecialNoteTag.deleteMany({ where: { animalId } });
      if (tags.specialNoteTags.length > 0) {
        await tx.animalSpecialNoteTag.createMany({
          data: tags.specialNoteTags.map((value) => ({ animalId, value })),
          skipDuplicates: true,
        });
      }
    }
  }
}
