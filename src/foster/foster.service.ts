import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Animal,
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
import { ApplyFosterDto } from './dto/foster-application.dto';

interface CreateAnimalInput {
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
}

interface UpdateAnimalInput {
  name?: string;
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
}

interface AnimalTagCollections {
  healthTags: readonly AnimalHealthTagType[];
  personalityTags: readonly AnimalPersonalityTagType[];
  environmentTags: readonly AnimalEnvironmentTagType[];
  specialNoteTags: readonly AnimalSpecialNoteTagType[];
}

type AnimalTagUpdates = Partial<AnimalTagCollections>;

interface AnimalCreateCommand {
  data: Prisma.AnimalCreateArgs['data'];
  images: string[];
  tags: AnimalTagCollections;
}

interface AnimalUpdateCommand {
  data: Prisma.AnimalUpdateArgs['data'];
  images?: string[];
  tags: AnimalTagUpdates;
}

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

  async applyFoster(user: AuthUser, dto: ApplyFosterDto): Promise<void> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.userId },
    });
    if (!profile?.isEligibleForFoster) {
      throw new ForbiddenException('foster-eligibility-required');
    }

    const animal = await this.prisma.animal.findUnique({
      where: { id: dto.animalId },
    });
    if (!animal) {
      throw new NotFoundException('animal-not-found');
    }
    if (animal.status === 'COMPLETED') {
      throw new BadRequestException('animal-already-fostered');
    }

    const duplicated = await this.prisma.fosterApplication.findFirst({
      where: { animalId: dto.animalId, userId: user.userId },
    });
    if (duplicated) {
      throw new BadRequestException('foster-application-duplicated');
    }

    await this.prisma.fosterApplication.create({
      data: {
        animalId: dto.animalId,
        userId: user.userId,
        applicantName: dto.applicantName,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        address: dto.address,
        addressDetail: dto.addressDetail,
        introduction: dto.introduction,
      },
    });
  }

  async createAnimal(user: AuthUser, dto: CreateAnimalInput): Promise<AnimalListItem> {
    this.assertOrgPermission(user, dto.orgId);
    const command = this.buildCreateAnimalCommand(user, dto);
    const created = await this.prisma.$transaction((tx) =>
      this.persistNewAnimal(tx, command),
    );
    return toAnimalListItem(created, 0);
  }

  async updateAnimal(
    id: string,
    user: AuthUser,
    dto: UpdateAnimalInput,
  ): Promise<AnimalListItem> {
    await this.ensureWritableAnimal(id, user);
    const command = this.buildUpdateAnimalCommand(dto);
    const updated = await this.prisma.$transaction((tx) =>
      this.persistUpdatedAnimal(tx, id, command),
    );
    const fosterDays = await this.computeFosterDays(updated.id, updated.createdAt);
    return toAnimalListItem(updated, fosterDays);
  }

  private assertOrgPermission(user: AuthUser, orgId?: string): void {
    if (orgId && user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('animal-org-only');
    }
  }

  private buildCreateAnimalCommand(
    user: AuthUser,
    dto: CreateAnimalInput,
  ): AnimalCreateCommand {
    const status = this.parseStatus(dto.status);
    const images = this.normalizeImages(dto.images);
    return {
      data: this.composeCreateAnimalData(user, dto, status, images),
      images,
      tags: this.toCreateTagCollections(dto),
    };
  }

  private buildUpdateAnimalCommand(dto: UpdateAnimalInput): AnimalUpdateCommand {
    const status = this.parseStatus(dto.status);
    const images =
      dto.images === undefined ? undefined : this.normalizeImages(dto.images);
    return {
      data: this.composeUpdateAnimalData(dto, status, images),
      images,
      tags: this.toUpdateTagCollections(dto),
    };
  }

  private composeCreateAnimalData(
    user: AuthUser,
    dto: CreateAnimalInput,
    status: AnimalStatus | undefined,
    images: readonly string[],
  ): Prisma.AnimalCreateArgs['data'] {
    return {
      ...this.composeCreateOwnershipData(user, dto),
      ...this.composeStatusData(status),
      ...this.composeClassificationData(dto),
      ...this.composeLifecycleData(dto),
      ...this.composeProfileForCreate(dto),
      ...this.composeEmergencyForCreate(dto),
      ...this.composeMainImageData(images),
    };
  }

  private composeUpdateAnimalData(
    dto: UpdateAnimalInput,
    status: AnimalStatus | undefined,
    images: readonly string[] | undefined,
  ): Prisma.AnimalUpdateArgs['data'] {
    return {
      ...this.composeUpdateOwnershipData(dto),
      ...this.composeStatusData(status),
      ...this.composeClassificationData(dto),
      ...this.composeLifecycleData(dto),
      ...this.composeProfileForUpdate(dto),
      ...this.composeEmergencyForUpdate(dto),
      ...this.composeMainImageData(images),
    };
  }

  private composeCreateOwnershipData(
    user: AuthUser,
    dto: CreateAnimalInput,
  ): Pick<Prisma.AnimalCreateArgs['data'], 'name' | 'orgId' | 'ownerUserId' | 'shared'> {
    return {
      name: dto.name,
      orgId: dto.orgId ?? null,
      ownerUserId: this.resolveOwnerUserId(user, dto.orgId),
      shared: dto.shared ?? false,
    };
  }

  private composeUpdateOwnershipData(
    dto: UpdateAnimalInput,
  ): Pick<Prisma.AnimalUpdateArgs['data'], 'name' | 'shared'> {
    return {
      name: dto.name ?? undefined,
      shared: dto.shared ?? undefined,
    };
  }

  private composeStatusData(
    status: AnimalStatus | undefined,
  ): Pick<Prisma.AnimalCreateArgs['data'], 'status'> {
    return {
      status: status ?? undefined,
    };
  }

  private composeClassificationData(
    dto: CreateAnimalInput | UpdateAnimalInput,
  ): Pick<Prisma.AnimalCreateArgs['data'], 'type' | 'size' | 'gender' | 'breed'> {
    return {
      type: dto.type ?? undefined,
      size: dto.size ?? undefined,
      gender: dto.gender ?? undefined,
      breed: dto.breed ?? undefined,
    };
  }

  private composeLifecycleData(
    dto: CreateAnimalInput | UpdateAnimalInput,
  ): Pick<
    Prisma.AnimalCreateArgs['data'],
    'birthDate' | 'isFosterCondition' | 'currentFosterStartDate' | 'currentFosterEndDate'
  > {
    return {
      birthDate: this.toDate(dto.birthDate),
      isFosterCondition: dto.isFosterCondition ?? undefined,
      currentFosterStartDate: this.toDate(dto.currentFosterStartDate),
      currentFosterEndDate: this.toDate(dto.currentFosterEndDate),
    };
  }

  private composeProfileForCreate(
    dto: CreateAnimalInput,
  ): Pick<Prisma.AnimalCreateArgs['data'], 'introduction' | 'remark'> {
    return {
      introduction: dto.introduction ?? undefined,
      remark: dto.remark ?? undefined,
    };
  }

  private composeProfileForUpdate(
    dto: UpdateAnimalInput,
  ): Pick<Prisma.AnimalUpdateArgs['data'], 'introduction' | 'remark'> {
    return {
      introduction: this.toOptionalNullableString(dto.introduction),
      remark: this.toOptionalNullableString(dto.remark),
    };
  }

  private composeEmergencyForCreate(
    dto: CreateAnimalInput,
  ): Pick<Prisma.AnimalCreateArgs['data'], 'emergency' | 'emergencyReason'> {
    return {
      emergency: dto.emergency ?? false,
      emergencyReason: dto.emergencyReason ?? undefined,
    };
  }

  private composeEmergencyForUpdate(
    dto: UpdateAnimalInput,
  ): Pick<Prisma.AnimalUpdateArgs['data'], 'emergency' | 'emergencyReason'> {
    return {
      emergency: dto.emergency ?? undefined,
      emergencyReason: this.toOptionalNullableString(dto.emergencyReason),
    };
  }

  private composeMainImageData(
    images: readonly string[] | undefined,
  ): Pick<Prisma.AnimalCreateArgs['data'], 'mainImageUrl'> {
    return {
      mainImageUrl: this.toMainImageValue(images),
    };
  }

  private resolveOwnerUserId(user: AuthUser, orgId?: string): string | null {
    return orgId ? null : user.userId;
  }

  private async persistNewAnimal(
    tx: Prisma.TransactionClient,
    command: AnimalCreateCommand,
  ): Promise<Animal> {
    const createdAnimal = await tx.animal.create({ data: command.data });
    await this.createAnimalImages(tx.animalImage, createdAnimal.id, command.images);
    await this.createAnimalTags(tx, createdAnimal.id, command.tags);
    return createdAnimal;
  }

  private async persistUpdatedAnimal(
    tx: Prisma.TransactionClient,
    animalId: string,
    command: AnimalUpdateCommand,
  ): Promise<Animal> {
    const updatedAnimal = await tx.animal.update({
      where: { id: animalId },
      data: command.data,
    });
    if (command.images !== undefined) {
      await this.replaceAnimalImages(tx.animalImage, animalId, command.images);
    }
    await this.replaceAnimalTags(tx, animalId, command.tags);
    return updatedAnimal;
  }

  private toCreateTagCollections(dto: CreateAnimalInput): AnimalTagCollections {
    return {
      healthTags: dto.healthTags ?? [],
      personalityTags: dto.personalityTags ?? [],
      environmentTags: dto.environmentTags ?? [],
      specialNoteTags: dto.specialNoteTags ?? [],
    };
  }

  private toUpdateTagCollections(dto: UpdateAnimalInput): AnimalTagUpdates {
    return {
      healthTags: dto.healthTags,
      personalityTags: dto.personalityTags,
      environmentTags: dto.environmentTags,
      specialNoteTags: dto.specialNoteTags,
    };
  }

  private toDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  private toOptionalNullableString(value?: string): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    return value ? value : null;
  }

  private toMainImageValue(
    images: readonly string[] | undefined,
  ): string | null | undefined {
    if (images === undefined) {
      return undefined;
    }
    return images.length > 0 ? images[0] : null;
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
    if (record?.animalId !== animalId) {
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
    if (record?.animalId !== animalId) {
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
    if (record?.animalId !== animalId) {
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
    tags: AnimalTagCollections,
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

  private async replaceAnimalTags(
    tx: Prisma.TransactionClient,
    animalId: string,
    tags: AnimalTagUpdates,
  ): Promise<void> {
    await Promise.all([
      this.replaceTagCollection(tx.animalHealthTag, animalId, tags.healthTags),
      this.replaceTagCollection(tx.animalPersonalityTag, animalId, tags.personalityTags),
      this.replaceTagCollection(tx.animalEnvironmentTag, animalId, tags.environmentTags),
      this.replaceTagCollection(tx.animalSpecialNoteTag, animalId, tags.specialNoteTags),
    ]);
  }

  private async replaceTagCollection<T>(
    model: {
      deleteMany(args: { where: { animalId: string } }): Promise<unknown>;
      createMany(args: {
        data: { animalId: string; value: T }[];
        skipDuplicates: true;
      }): Promise<unknown>;
    },
    animalId: string,
    values?: readonly T[],
  ): Promise<void> {
    if (values === undefined) {
      return;
    }
    await model.deleteMany({ where: { animalId } });
    if (!values.length) {
      return;
    }
    await model.createMany({
      data: values.map((value) => ({ animalId, value })),
      skipDuplicates: true,
    });
  }
}
