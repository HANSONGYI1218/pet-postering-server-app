import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { calculateFosterDays } from '../domain/foster/domain/metrics';
import type {
  PublicFosterAnimalDetail,
  PublicFosterAnimalListResult,
} from '../domain/public-foster/application/types';
import {
  type RawAnimal,
  toPublicFosterDetail,
  toPublicFosterListItem,
} from '../domain/public-foster/domain/mappers';
import { PrismaService } from '../prisma/prisma.service';

const ANIMAL_INCLUDE: Prisma.AnimalInclude = {
  organization: true,
  images: true,
  healthTags: true,
  personalityTags: true,
  environmentTags: true,
  specialNoteTags: true,
};

@Injectable()
export class PublicFosterService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnimals(): Promise<PublicFosterAnimalListResult> {
    const animals = await this.prisma.animal.findMany({
      include: ANIMAL_INCLUDE,
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
        return toPublicFosterListItem(animal as RawAnimal, fosterDays);
      }),
    );
    return { items };
  }

  async getAnimal(id: string): Promise<PublicFosterAnimalDetail> {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: ANIMAL_INCLUDE,
    });
    if (!animal) throw new NotFoundException('public-animal-not-found');
    return toPublicFosterDetail(animal as RawAnimal);
  }
}
