import { Injectable } from '@nestjs/common';
import type { FosterCondition, FosterExperience, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type {
  FosterExperienceDto,
  UpsertFosterConditionDto,
} from './dto/foster-condition.dto';

const toNullableDate = (value?: string): Date | null => (value ? new Date(value) : null);

const normalizeExperience = (
  experience: FosterExperienceDto,
  fosterConditionId: string,
): Prisma.FosterExperienceCreateManyInput => ({
  fosterConditionId,
  animalType: experience.animalType ?? null,
  animalSize: experience.animalSize ?? null,
  animalAge: experience.animalAge ?? null,
  startDate: toNullableDate(experience.startDate),
  endDate: toNullableDate(experience.endDate),
  organizationName: experience.organizationName ?? null,
  note: experience.note ?? null,
});

type FosterConditionWithExperience = FosterCondition & {
  experiences: FosterExperience[];
};

type FosterConditionTx = Pick<
  Prisma.TransactionClient,
  'fosterCondition' | 'fosterExperience' | 'userProfile'
>;

@Injectable()
export class FosterConditionService {
  constructor(private readonly prisma: PrismaService) {}

  getMyCondition(userId: string): Promise<FosterConditionWithExperience | null> {
    return this.prisma.fosterCondition.findUnique({
      where: { userId },
      include: { experiences: true },
    }) as Promise<FosterConditionWithExperience | null>;
  }

  async upsertMyCondition(
    userId: string,
    dto: UpsertFosterConditionDto,
  ): Promise<FosterConditionWithExperience | null> {
    const experiences = dto.experiences ?? [];
    const conditionData = this.toConditionData(dto, userId);

    return this.prisma.$transaction(async (tx) => {
      const condition = await tx.fosterCondition.upsert(conditionData);

      await this.syncExperiences(tx, condition.id, experiences);
      await this.ensureFosterEligibility(tx, userId);

      return tx.fosterCondition.findUnique({
        where: { id: condition.id },
        include: { experiences: true },
      }) as Promise<FosterConditionWithExperience | null>;
    });
  }

  async deleteMyCondition(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.fosterCondition.deleteMany({ where: { userId } });
      await this.ensureFosterEligibility(tx, userId, false);
    });
  }

  private toConditionData(
    dto: UpsertFosterConditionDto,
    userId: string,
  ): Prisma.FosterConditionUpsertArgs {
    const payload = {
      preferredTypes: dto.preferredTypes,
      preferredSizes: dto.preferredSizes,
      preferredAges: dto.preferredAges,
      fosterEnvironments: dto.fosterEnvironments,
      specialNoteTags: dto.specialNoteTags,
      fosterPeriod: dto.fosterPeriod ?? null,
    };

    return {
      where: { userId },
      create: { userId, ...payload },
      update: payload,
    };
  }

  private async syncExperiences(
    tx: FosterConditionTx,
    conditionId: string,
    experiences: FosterExperienceDto[],
  ): Promise<void> {
    if (experiences.length === 0) {
      await tx.fosterExperience.deleteMany({ where: { fosterConditionId: conditionId } });
      return;
    }

    const existing = await tx.fosterExperience.findMany({
      where: { fosterConditionId: conditionId },
      select: { id: true },
    });

    const incomingWithId = experiences.filter((experience) => experience.id);
    const incomingMap = new Map(
      incomingWithId.map((experience) => [experience.id as string, experience]),
    );

    const deleteIds = existing
      .filter(({ id }) => !incomingMap.has(id))
      .map(({ id }) => id);

    if (deleteIds.length > 0) {
      await tx.fosterExperience.deleteMany({ where: { id: { in: deleteIds } } });
    }

    if (incomingWithId.length > 0) {
      await Promise.all(
        incomingWithId.map((experience) =>
          tx.fosterExperience.update({
            where: { id: experience.id as string },
            data: this.toExperienceUpdate(experience),
          }),
        ),
      );
    }

    const toCreate = experiences.filter((experience) => !experience.id);
    if (toCreate.length > 0) {
      await tx.fosterExperience.createMany({
        data: toCreate.map((experience) => normalizeExperience(experience, conditionId)),
      });
    }
  }

  private toExperienceUpdate(
    experience: FosterExperienceDto,
  ): Prisma.FosterExperienceUpdateInput {
    return {
      animalType: experience.animalType ?? null,
      animalSize: experience.animalSize ?? null,
      animalAge: experience.animalAge ?? null,
      startDate: toNullableDate(experience.startDate),
      endDate: toNullableDate(experience.endDate),
      organizationName: experience.organizationName ?? null,
      note: experience.note ?? null,
    };
  }

  private ensureFosterEligibility(
    tx: FosterConditionTx,
    userId: string,
    isEligible = true,
  ): Promise<unknown> {
    return tx.userProfile.upsert({
      where: { userId },
      create: { userId, isEligibleForFoster: isEligible },
      update: { isEligibleForFoster: isEligible },
    });
  }
}
