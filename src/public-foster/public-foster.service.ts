import { Injectable, NotFoundException } from '@nestjs/common';

import { loadFirstRecordDateMap } from '../domain/foster/application/foster-days';
import { calculateFosterDays } from '../domain/foster/domain/metrics';
import type {
  PublicFosterAnimalDetail,
  PublicFosterAnimalListResult,
} from '../domain/public-foster/application/types';
import {
  PUBLIC_FOSTER_ANIMAL_INCLUDE,
  PUBLIC_FOSTER_ANIMAL_QUERY,
  toPublicFosterDetail,
  toPublicFosterListItem,
} from '../domain/public-foster/domain/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicFosterService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnimals(): Promise<PublicFosterAnimalListResult> {
    const animals = await this.prisma.animal.findMany({
      ...PUBLIC_FOSTER_ANIMAL_QUERY,
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const firstRecordMap = await loadFirstRecordDateMap(
      this.prisma.fosterRecord,
      animals.map((animal) => animal.id),
    );
    const items = animals.map((animal) => {
      const fosterDays = calculateFosterDays({
        now,
        firstRecordDate: firstRecordMap.get(animal.id) ?? null,
        fallbackCreatedAt: animal.createdAt,
      });
      return toPublicFosterListItem(animal, fosterDays);
    });
    return { items };
  }

  async getAnimal(id: string): Promise<PublicFosterAnimalDetail> {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: PUBLIC_FOSTER_ANIMAL_INCLUDE,
    });
    if (!animal) {
      throw new NotFoundException('public-animal-not-found');
    }
    return toPublicFosterDetail(animal);
  }
}
