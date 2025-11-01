import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { PublicFosterRecordsService } from './public-foster-records.service';

const mockAnimal = {
  id: 'animal-1',
  name: 'Buddy',
  status: 'IN_PROGRESS',
  createdAt: new Date('2024-08-01T00:00:00.000Z'),
  breed: 'Jindo',
  birthDate: new Date('2024-01-01T00:00:00.000Z'),
  gender: 'MALE',
  type: 'DOG',
  introduction: 'Nice dog',
  remark: 'Loves walks',
  images: [],
  currentFosterStartDate: new Date('2024-08-01T00:00:00.000Z'),
  currentFosterEndDate: new Date('2024-08-10T00:00:00.000Z'),
  organization: {
    id: 'org-1',
    name: 'Org',
    phoneNumber: '010-0000-0000',
    zipcode: '01234',
    address: 'Seoul',
    addressDetail: 'Unit 101',
    email: 'hello@example.com',
  },
} as any;

describe('PublicFosterRecordsService', () => {
  const build = () => {
    const prisma = {
      animal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      fosterRecord: {
        findMany: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    } satisfies Record<string, Record<string, jest.Mock>>;
    const service = new PublicFosterRecordsService(prisma as unknown as PrismaService);
    return { service, prisma };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-08-12T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists record animals', async () => {
    const { service, prisma } = build();
    prisma.animal.findMany.mockResolvedValueOnce([mockAnimal]);

    const result = await service.listAnimals();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'animal-1',
      fosterDuration: 9,
      state: 'IN_PROGRESS',
    });
  });

  it('maps completed status to COMPLETED', async () => {
    const { service, prisma } = build();
    prisma.animal.findMany.mockResolvedValueOnce([
      { ...mockAnimal, id: 'animal-3', status: 'COMPLETED' },
    ]);

    const result = await service.listAnimals();

    expect(result.items[0].state).toBe('COMPLETED');
  });

  it('falls back to earliest record date when foster duration is zero', async () => {
    const { service, prisma } = build();
    const fallbackAnimal = {
      ...mockAnimal,
      id: 'animal-2',
      currentFosterStartDate: null,
      currentFosterEndDate: null,
      createdAt: new Date('2024-08-05T00:00:00.000Z'),
    };
    prisma.animal.findMany.mockResolvedValueOnce([fallbackAnimal]);
    prisma.fosterRecord.groupBy.mockResolvedValueOnce([
      {
        animalId: 'animal-2',
        _min: { date: new Date('2024-08-06T00:00:00.000Z') },
      },
    ]);

    const result = await service.listAnimals();

    expect(prisma.fosterRecord.groupBy).toHaveBeenCalledWith({
      by: ['animalId'],
      _min: { date: true },
      where: { animalId: { in: ['animal-2'] } },
    });
    expect(result.items[0].fosterDuration).toBe(6);
  });

  it('returns detail when animal exists', async () => {
    const { service, prisma } = build();
    prisma.animal.findUnique.mockResolvedValueOnce(mockAnimal);
    prisma.fosterRecord.findMany.mockResolvedValueOnce([
      {
        id: 'record-1',
        animalId: 'animal-1',
        date: new Date('2024-08-02T00:00:00.000Z'),
        content: 'hello',
        healthNote: 'fine',
        createdAt: new Date('2024-08-02T00:00:00.000Z'),
        updatedAt: new Date('2024-08-02T01:00:00.000Z'),
        images: [],
      },
    ]);

    const detail = await service.getAnimal('animal-1');

    expect(detail.info.id).toBe('animal-1');
    expect(detail.records).toHaveLength(1);
    expect(detail.records[0]).toMatchObject({
      healthNote: 'fine',
    });
    expect(detail.info.state).toBe('IN_PROGRESS');
    expect(detail.info.animal.introduction).toBe('Nice dog');
    expect(detail.info.animal.currentFosterStartDate).toBe('2024-08-01T00:00:00.000Z');
    expect(detail.info.animal.currentFosterEndDate).toBe('2024-08-10T00:00:00.000Z');
  });

  it('throws when animal missing', async () => {
    const { service, prisma } = build();
    prisma.animal.findUnique.mockResolvedValueOnce(null);

    await expect(service.getAnimal('missing')).rejects.toThrow(NotFoundException);
  });
});
