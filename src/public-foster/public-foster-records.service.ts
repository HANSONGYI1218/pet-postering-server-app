import { Injectable, NotFoundException } from '@nestjs/common';

import { loadFirstRecordDateMap } from '../domain/foster/application/foster-days';
import { calculateFosterDays } from '../domain/foster/domain/metrics';
import type {
  PublicRecordDetail,
  PublicRecordListResult,
} from '../domain/public-foster/application/record.types';
import {
  PUBLIC_FOSTER_ANIMAL_INCLUDE,
  PUBLIC_FOSTER_ANIMAL_QUERY,
} from '../domain/public-foster/domain/mappers';
import {
  toRecordAnimal,
  toRecordDetail,
} from '../domain/public-foster/domain/record-mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicFosterRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnimals(): Promise<PublicRecordListResult> {
    const animals = await this.prisma.animal.findMany({
      where: { records: { some: {} } },
      ...PUBLIC_FOSTER_ANIMAL_QUERY,
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const baseAnimals = animals.map((animal) => ({
      animal,
      base: toRecordAnimal(animal, { now }),
    }));
    const fallbackAnimalIds = baseAnimals
      .filter(({ base }) => base.fosterDuration === 0)
      .map(({ animal }) => animal.id);
    const firstRecordMap = await loadFirstRecordDateMap(
      this.prisma.fosterRecord,
      fallbackAnimalIds,
    );
    const items = baseAnimals.map(({ animal, base }) => {
      if (base.fosterDuration > 0) {
        return base;
      }
      const fosterDuration = calculateFosterDays({
        now,
        firstRecordDate: firstRecordMap.get(animal.id) ?? null,
        fallbackCreatedAt: animal.createdAt,
      });
      return {
        ...base,
        fosterDuration,
      };
    });

    return { items };
  }

  async getAnimal(id: string): Promise<PublicRecordDetail> {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: PUBLIC_FOSTER_ANIMAL_INCLUDE,
    });
    if (!animal) {
      throw new NotFoundException('public-record-animal-not-found');
    }

    const records = await this.prisma.fosterRecord.findMany({
      where: { animalId: id },
      include: { images: true },
      orderBy: { date: 'asc' },
    });

    return toRecordDetail({ animal, records });
  }

  async getAnimalsByUserId(userId: string): Promise<PublicRecordDetail> {
    const animal = await this.prisma.animal.findFirst({
      where: { ownerUserId: userId },
      include: PUBLIC_FOSTER_ANIMAL_INCLUDE,
    });
    if (!animal) {
      throw new NotFoundException('public-record-animal-not-found');
    }

    const records = await this.prisma.fosterRecord.findMany({
      where: { animalId: animal.id },
      include: { images: true },
      orderBy: { date: 'asc' },
    });

    return toRecordDetail({ animal, records });
  }
}
