import { Injectable, NotFoundException } from '@nestjs/common';
import { loadFirstRecordDateMap } from 'src/domain/foster/application/foster-days';
import { calculateFosterDays } from 'src/domain/foster/domain/metrics';
import { FosterMatcherAnimalListResult } from 'src/domain/public-foster/application/matcher.types';
import { calculateScore } from 'src/domain/public-foster/domain/foster-matching';
import { toFosterMatcherListItem } from 'src/domain/public-foster/domain/matcher-mappers';
import {
  PUBLIC_FOSTER_ANIMAL_QUERY,
  RawAnimal,
} from '../domain/public-foster/domain/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FosterMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async listMatchedAnimals(userId: string): Promise<FosterMatcherAnimalListResult> {
    const animals = await this.prisma.animal.findMany({
      where: { status: 'WAITING' },
      ...PUBLIC_FOSTER_ANIMAL_QUERY,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (animals.length === 0) {
      return { items: [] };
    }

    const userCondition = await this.prisma.fosterCondition.findUnique({
      where: { userId: userId },
    });

    if (!userCondition) {
      throw new NotFoundException('user-not-found');
    }

    const filteredAnimals = animals.map((animal) => ({
      originalAnimal: animal,
      id: animal.id,
      type: animal.type,
      age: animal.birthDate,
      size: animal.size,
      healthTags: animal.healthTags.map((tag) => tag.value),
      personalityTags: animal.personalityTags.map((tag) => tag.value),
      environmentTags: animal.environmentTags.map((tag) => tag.value),
      specialNoteTags: animal.specialNoteTags.map((tag) => tag.value),
      createdAt: animal.createdAt,
    }));

    const now = new Date();

    const firstRecordMap = await loadFirstRecordDateMap(
      this.prisma.fosterRecord,
      animals.map((animal) => animal.id),
    );

    const scoredAnimals: {
      animal: RawAnimal;
      fosterDays: number;
      matcherScore: number;
    }[] = await Promise.all(
      filteredAnimals.map(async (animal) => {
        const fosterDays = calculateFosterDays({
          now,
          firstRecordDate: firstRecordMap.get(animal.id) ?? null,
          fallbackCreatedAt: animal.createdAt,
        });

        return {
          animal: animal.originalAnimal,
          fosterDays,
          matcherScore: await calculateScore(animal, userCondition),
        };
      }),
    );

    const sortedAnimals = scoredAnimals
      .sort(
        (a: { matcherScore: number }, b: { matcherScore: number }) =>
          b.matcherScore - a.matcherScore,
      )
      .slice(0, 10);

    const items = sortedAnimals.map(toFosterMatcherListItem);

    return { items };
  }
}
