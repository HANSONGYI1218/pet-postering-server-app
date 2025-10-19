import { Injectable, NotFoundException } from '@nestjs/common';

import { resolveFosterDaysForAnimal } from '../domain/foster/application/foster-days';
import type {
  PublicRecordDetail,
  PublicRecordListResult,
} from '../domain/public-foster/application/record.types';
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
      include: {
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const items = await Promise.all(
      animals.map(async (animal) => {
        const base = toRecordAnimal(animal);
        if (base.fosterDuration > 0) return base;

        const fallbackDuration = await resolveFosterDaysForAnimal(
          this.prisma.fosterRecord,
          {
            animalId: animal.id,
            fallbackCreatedAt: animal.createdAt,
            now,
          },
        );
        return {
          ...base,
          fosterDuration: fallbackDuration,
        };
      }),
    );

    return { items };
  }

  async getAnimal(id: string): Promise<PublicRecordDetail> {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        images: true,
        organization: true,
      },
    });
    if (!animal) throw new NotFoundException('public-record-animal-not-found');

    const records = await this.prisma.fosterRecord.findMany({
      where: { animalId: id },
      include: { images: true },
      orderBy: { date: 'asc' },
    });

    return toRecordDetail({ animal, records });
  }
}
