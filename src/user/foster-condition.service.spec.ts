import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AnimalAge,
  AnimalEnvironmentTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalType,
} from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import { FosterConditionService } from './foster-condition.service';

type MockFn = jest.Mock;

interface PrismaMock {
  fosterCondition: {
    findUnique: MockFn;
  };
  $transaction: MockFn;
}

interface PrismaTxMock {
  fosterCondition: {
    upsert: MockFn;
    findUnique: MockFn;
    deleteMany: MockFn;
  };
  fosterExperience: {
    findMany: MockFn;
    deleteMany: MockFn;
    update: MockFn;
    createMany: MockFn;
  };
  userProfile: {
    upsert: MockFn;
  };
}

const buildService = () => {
  const prisma: PrismaMock = {
    fosterCondition: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const tx: PrismaTxMock = {
    fosterCondition: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    fosterExperience: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation((callback) => callback(tx as any));

  const service = new FosterConditionService(prisma as unknown as PrismaService);

  return { service, prisma, tx };
};

describe('FosterConditionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyCondition', () => {
    it('returns the foster condition for the user', async () => {
      const { service, prisma } = buildService();
      prisma.fosterCondition.findUnique.mockResolvedValueOnce({ id: 'fc-1' });

      await expect(service.getMyCondition('user-1')).resolves.toEqual({ id: 'fc-1' });

      expect(prisma.fosterCondition.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { experiences: true },
      });
    });
  });

  describe('upsertMyCondition', () => {
    it('upserts condition/experiences and marks user eligible', async () => {
      const { service, tx, prisma } = buildService();

      tx.fosterCondition.upsert.mockResolvedValueOnce({
        id: 'fc-1',
        userId: 'user-1',
      });

      tx.fosterExperience.findMany.mockResolvedValueOnce([
        { id: 'exp-1', fosterConditionId: 'fc-1' },
        { id: 'exp-2', fosterConditionId: 'fc-1' },
      ]);

      tx.fosterCondition.findUnique.mockResolvedValueOnce({
        id: 'fc-1',
        experiences: [
          { id: 'exp-1', animalType: AnimalType.DOG },
          { id: 'exp-3', animalType: AnimalType.CAT },
        ],
      });

      const dto = {
        preferredTypes: [AnimalType.DOG],
        preferredSizes: [AnimalSize.SMALL],
        preferredAges: [AnimalAge.ADULT],
        fosterEnvironments: [AnimalEnvironmentTagType.QUIET_ENVIRONMENT],
        specialNoteTags: [AnimalSpecialNoteTagType.SEPARATION_ANXIETY],
        fosterPeriod: 'WEEK',
        experiences: [
          {
            id: 'exp-1',
            animalType: AnimalType.DOG,
            animalSize: AnimalSize.SMALL,
            animalAge: AnimalAge.ADULT,
            startDate: '2025-01-01T00:00:00.000Z',
          },
          {
            animalType: AnimalType.CAT,
            animalSize: AnimalSize.MEDIUM,
            animalAge: AnimalAge.JUVENILE,
          },
        ],
      } as const;

      await expect(service.upsertMyCondition('user-1', dto)).resolves.toEqual({
        id: 'fc-1',
        experiences: [
          { id: 'exp-1', animalType: AnimalType.DOG },
          { id: 'exp-3', animalType: AnimalType.CAT },
        ],
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.fosterCondition.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: {
          userId: 'user-1',
          preferredTypes: dto.preferredTypes,
          preferredSizes: dto.preferredSizes,
          preferredAges: dto.preferredAges,
          fosterEnvironments: dto.fosterEnvironments,
          specialNoteTags: dto.specialNoteTags,
          fosterPeriod: dto.fosterPeriod,
        },
        update: {
          preferredTypes: dto.preferredTypes,
          preferredSizes: dto.preferredSizes,
          preferredAges: dto.preferredAges,
          fosterEnvironments: dto.fosterEnvironments,
          specialNoteTags: dto.specialNoteTags,
          fosterPeriod: dto.fosterPeriod,
        },
      });

      expect(tx.fosterExperience.findMany).toHaveBeenCalledWith({
        where: { fosterConditionId: 'fc-1' },
        select: { id: true },
      });

      expect(tx.fosterExperience.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['exp-2'] } },
      });

      expect(tx.fosterExperience.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: {
          animalType: AnimalType.DOG,
          animalSize: AnimalSize.SMALL,
          animalAge: AnimalAge.ADULT,
          startDate: new Date('2025-01-01T00:00:00.000Z'),
          endDate: null,
          organizationName: null,
          note: null,
        },
      });

      expect(tx.fosterExperience.createMany).toHaveBeenCalledWith({
        data: [
          {
            fosterConditionId: 'fc-1',
            animalType: AnimalType.CAT,
            animalSize: AnimalSize.MEDIUM,
            animalAge: AnimalAge.JUVENILE,
            startDate: null,
            endDate: null,
            organizationName: null,
            note: null,
          },
        ],
      });

      expect(tx.userProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', isEligibleForFoster: true },
        update: { isEligibleForFoster: true },
      });

      expect(tx.fosterCondition.findUnique).toHaveBeenCalledWith({
        where: { id: 'fc-1' },
        include: { experiences: true },
      });
      expect(prisma.fosterCondition.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('deleteMyCondition', () => {
    it('deletes the condition and marks user ineligible', async () => {
      const { service, tx, prisma } = buildService();

      tx.fosterCondition.deleteMany.mockResolvedValueOnce({ count: 1 });

      await expect(service.deleteMyCondition('user-1')).resolves.toBeUndefined();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.fosterCondition.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(tx.userProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', isEligibleForFoster: false },
        update: { isEligibleForFoster: false },
      });
    });
  });
});
