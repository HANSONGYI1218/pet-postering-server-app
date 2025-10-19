import { describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../common/types';
import type { PrismaService } from '../prisma/prisma.service';
import { FosterService } from './foster.service';

type MockFn = jest.Mock;

interface PrismaMock {
  animal: {
    findMany: MockFn;
    findUnique: MockFn;
    create: MockFn;
    update: MockFn;
    delete: MockFn;
  };
  fosterRecord: {
    findFirst: MockFn;
    findMany: MockFn;
    findUnique: MockFn;
    create: MockFn;
    update: MockFn;
    delete: MockFn;
  };
  fosterRecordImage: {
    deleteMany: MockFn;
    createMany: MockFn;
    findMany: MockFn;
  };
  $transaction: MockFn;
}

const build = () => {
  const prisma: PrismaMock = {
    animal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    fosterRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    fosterRecordImage: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const service = new FosterService(prisma as unknown as PrismaService);
  return { service, prisma };
};

describe('FosterService', () => {
  describe('updateRecord', () => {
    it('updates a record while replacing images', async () => {
      const { service, prisma } = build();
      const user: AuthUser = { userId: 'admin', role: 'ORG_ADMIN' };
      const record = {
        id: 'record-1',
        animalId: 'animal-1',
      } as any;
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(record);
      const animal = {
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      } as any;
      prisma.animal.findUnique.mockResolvedValueOnce(animal);

      const updated = {
        id: 'record-1',
        animalId: 'animal-1',
        date: new Date('2024-02-01T00:00:00.000Z'),
        content: 'new content',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T12:00:00.000Z'),
      } as any;
      const images = [
        {
          id: 'img-1',
          recordId: 'record-1',
          url: 'https://img/1',
          sortOrder: 0,
        },
      ];
      const tx = {
        fosterRecord: {
          update: jest.fn().mockResolvedValueOnce(updated),
        },
        fosterRecordImage: {
          deleteMany: jest.fn().mockResolvedValueOnce(undefined),
          createMany: jest.fn().mockResolvedValueOnce(undefined),
          findMany: jest.fn().mockResolvedValueOnce(images),
        },
      };
      prisma.$transaction.mockImplementation((cb: (client: typeof tx) => unknown) =>
        Promise.resolve(cb(tx)),
      );

      const dto = {
        date: '2024-02-01',
        content: 'new content',
        images: Array.from({ length: 7 }, (_, i) => `https://img/${String(i + 1)}`),
      };

      const result = await service.updateRecord('animal-1', 'record-1', user, dto);

      expect(prisma.fosterRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'record-1' },
      });
      expect(prisma.animal.findUnique).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.fosterRecord.update).toHaveBeenCalledWith({
        where: { id: 'record-1' },
        data: {
          content: 'new content',
          date: new Date('2024-02-01'),
        },
      });
      expect(tx.fosterRecordImage.deleteMany).toHaveBeenCalledWith({
        where: { recordId: 'record-1' },
      });
      expect(tx.fosterRecordImage.createMany).toHaveBeenCalledWith({
        data: dto.images.slice(0, 6).map((url, i) => ({
          recordId: 'record-1',
          url,
          sortOrder: i,
        })),
      });
      expect(tx.fosterRecordImage.findMany).toHaveBeenCalledWith({
        where: { recordId: 'record-1' },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result).toEqual({
        id: 'record-1',
        animalId: 'animal-1',
        date: updated.date,
        content: updated.content,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        images: images.map(({ id, url, sortOrder }) => ({ id, url, sortOrder })),
      });
    });

    it('removes all images when dto.images is an empty array', async () => {
      const { service, prisma } = build();
      const user: AuthUser = { userId: 'admin', role: 'ORG_ADMIN' };
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-2',
        animalId: 'animal-2',
      });
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-2',
        orgId: 'org-1',
        ownerUserId: null,
      });

      const updated = {
        id: 'record-2',
        animalId: 'animal-2',
        date: new Date('2024-03-01T00:00:00.000Z'),
        content: 'without images',
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-03-02T00:00:00.000Z'),
      } as any;
      const tx = {
        fosterRecord: {
          update: jest.fn().mockResolvedValueOnce(updated),
        },
        fosterRecordImage: {
          deleteMany: jest.fn().mockResolvedValueOnce(undefined),
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValueOnce([]),
        },
      };
      prisma.$transaction.mockImplementation((cb: (client: typeof tx) => unknown) =>
        Promise.resolve(cb(tx)),
      );

      const result = await service.updateRecord('animal-2', 'record-2', user, {
        images: [],
        content: 'without images',
      });

      expect(tx.fosterRecordImage.deleteMany).toHaveBeenCalledWith({
        where: { recordId: 'record-2' },
      });
      expect(tx.fosterRecordImage.createMany).not.toHaveBeenCalled();
      expect(result.images).toEqual([]);
    });

    it('throws ForbiddenException when the user lacks write permission', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.updateRecord(
          'animal-1',
          'record-1',
          {
            userId: 'intruder',
            role: 'USER',
          },
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('listAnimals', () => {
    it('applies status filters and calculates foster days', async () => {
      const { service, prisma } = build();
      const createdAtA = new Date('2024-01-01T00:00:00.000Z');
      const createdAtB = new Date('2024-01-05T00:00:00.000Z');
      prisma.animal.findMany.mockResolvedValueOnce([
        { id: 'animal-a', status: 'WAITING', createdAt: createdAtA } as any,
        { id: 'animal-b', status: 'WAITING', createdAt: createdAtB } as any,
      ]);
      prisma.fosterRecord.findFirst
        .mockResolvedValueOnce({ date: new Date('2023-12-31T00:00:00.000Z') })
        .mockResolvedValueOnce(null);

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-10T00:00:00.000Z'));

      const result = await service.listAnimals('WAITING');

      jest.useRealTimers();

      expect(prisma.animal.findMany).toHaveBeenCalledWith({
        where: { status: 'WAITING' },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.fosterRecord.findFirst).toHaveBeenNthCalledWith(1, {
        where: { animalId: 'animal-a' },
        orderBy: { date: 'asc' },
        select: { date: true },
      });
      expect(prisma.fosterRecord.findFirst).toHaveBeenNthCalledWith(2, {
        where: { animalId: 'animal-b' },
        orderBy: { date: 'asc' },
        select: { date: true },
      });
      const daysById = Object.fromEntries(
        result.items.map((item: any) => [item.id, item.fosterDays]),
      );
      expect(daysById).toEqual({ 'animal-a': 10, 'animal-b': 5 });
    });

    it('returns all animals when status is not provided', async () => {
      const { service, prisma } = build();
      prisma.animal.findMany.mockResolvedValueOnce([
        {
          id: 'animal-1',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        } as any,
      ]);
      prisma.fosterRecord.findFirst.mockResolvedValueOnce(null);

      jest.useFakeTimers().setSystemTime(new Date('2024-01-03T00:00:00.000Z'));
      await service.listAnimals();
      jest.useRealTimers();

      expect(prisma.animal.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('listSharedAnimals', () => {
    it('filters animals with shared=true', async () => {
      const { service, prisma } = build();
      prisma.animal.findMany.mockResolvedValueOnce([
        { id: 'animal-1', shared: true, createdAt: new Date() } as any,
      ]);
      prisma.fosterRecord.findFirst.mockResolvedValueOnce(null);

      jest.useFakeTimers().setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
      await service.listSharedAnimals();
      jest.useRealTimers();

      expect(prisma.animal.findMany).toHaveBeenCalledWith({
        where: { shared: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createAnimal', () => {
    it('allows only ORG_ADMIN to create organization animals', async () => {
      const { service, prisma } = build();

      await expect(
        service.createAnimal(
          { userId: 'user-1', role: 'USER' },
          { name: 'Buddy', orgId: 'org-1' },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.create).not.toHaveBeenCalled();
    });

    it('creates animals with orgId and shared flags when ORG_ADMIN', async () => {
      const { service, prisma } = build();
      prisma.animal.create.mockResolvedValueOnce({ id: 'animal-1' } as any);

      await expect(
        service.createAnimal(
          { userId: 'admin', role: 'ORG_ADMIN' },
          { name: 'Buddy', orgId: 'org-1', shared: true },
        ),
      ).resolves.toMatchObject({ id: 'animal-1', fosterDays: 0 });
      expect(prisma.animal.create).toHaveBeenCalledWith({
        data: { name: 'Buddy', orgId: 'org-1', shared: true },
      });
    });

    it('sets ownerUserId to the requester for personal animals', async () => {
      const { service, prisma } = build();
      prisma.animal.create.mockResolvedValueOnce({ id: 'animal-2' } as any);

      await expect(
        service.createAnimal(
          { userId: 'owner-1', role: 'USER' },
          { name: 'Cat', shared: false },
        ),
      ).resolves.toMatchObject({ id: 'animal-2', fosterDays: 0 });
      expect(prisma.animal.create).toHaveBeenCalledWith({
        data: { name: 'Cat', ownerUserId: 'owner-1', shared: false },
      });
    });
  });

  describe('listRecords', () => {
    it('uses the default six-month window when listing records', async () => {
      const { service, prisma } = build();
      const now = new Date('2024-06-15T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        name: 'Buddy',
        status: 'FOSTERING',
        shared: true,
        organization: { id: 'org-1', name: 'Rescue' },
      } as any);
      const records = [
        {
          id: 'rec-1',
          animalId: 'animal-1',
          date: new Date('2024-05-01T00:00:00.000Z'),
          images: [],
        },
      ];
      prisma.fosterRecord.findMany.mockResolvedValueOnce(records as any);

      const result = await service.listRecords('animal-1');

      jest.useRealTimers();

      const expectedFrom = new Date(now);
      expectedFrom.setMonth(expectedFrom.getMonth() - 6);
      const expectedTo = new Date(now);
      expectedTo.setMonth(expectedTo.getMonth() + 6);

      expect(prisma.fosterRecord.findMany).toHaveBeenCalledWith({
        where: {
          animalId: 'animal-1',
          date: { gte: expectedFrom, lte: expectedTo },
        },
        orderBy: { date: 'asc' },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
      expect(result).toEqual({
        animalId: 'animal-1',
        animal: {
          id: 'animal-1',
          name: 'Buddy',
          status: 'FOSTERING',
          shared: true,
          organization: { id: 'org-1', name: 'Rescue' },
        },
        from: expectedFrom.toISOString(),
        to: expectedTo.toISOString(),
        items: records,
      });
    });

    it('respects the provided custom date range', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        name: 'Buddy',
        status: 'FOSTERING',
        shared: false,
        organization: null,
      } as any);
      prisma.fosterRecord.findMany.mockResolvedValueOnce([] as any);

      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-03-01T00:00:00.000Z';
      await service.listRecords('animal-1', from, to);

      expect(prisma.fosterRecord.findMany).toHaveBeenCalledWith({
        where: {
          animalId: 'animal-1',
          date: { gte: new Date(from), lte: new Date(to) },
        },
        orderBy: { date: 'asc' },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    it('throws BadRequestException for an invalid date range', async () => {
      const { service } = build();

      await expect(
        service.listRecords('animal-1', 'not-a-date', undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAnimal', () => {
    it('throws NotFoundException when the animal is missing', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateAnimal('animal-1', { userId: 'user-1', role: 'USER' }, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows only ORG_ADMIN to update organization animals', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      });

      await expect(
        service.updateAnimal('animal-1', { userId: 'user-2', role: 'USER' }, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.update).not.toHaveBeenCalled();
    });

    it('allows only the owner to modify personal animals', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.updateAnimal('animal-1', { userId: 'user-2', role: 'USER' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates the status when the request is valid', async () => {
      const { service, prisma } = build();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-10T00:00:00.000Z'));
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
        createdAt: new Date('2024-01-05T00:00:00.000Z'),
      });
      prisma.animal.update.mockResolvedValueOnce({
        id: 'animal-1',
        createdAt: new Date('2024-01-05T00:00:00.000Z'),
      } as any);
      prisma.fosterRecord.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateAnimal(
          'animal-1',
          { userId: 'owner-1', role: 'USER' },
          { name: 'Buddy', shared: true, status: 'WAITING' },
        ),
      ).resolves.toMatchObject({ id: 'animal-1', fosterDays: 5 });
      jest.useRealTimers();
      expect(prisma.animal.update).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
        data: {
          name: 'Buddy',
          shared: true,
          status: 'WAITING',
        },
      });
    });

    it('throws BadRequestException when status value is invalid', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.updateAnimal(
          'animal-1',
          { userId: 'owner-1', role: 'USER' },
          { status: 'INVALID' },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.animal.update).not.toHaveBeenCalled();
    });
  });

  describe('createRecord', () => {
    it('throws ForbiddenException when non-ORG_ADMIN accesses an organization animal', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      });

      await expect(
        service.createRecord(
          'animal-1',
          { userId: 'user-1', role: 'USER' },
          {
            date: '2024-01-01',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.fosterRecord.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when non-owner accesses a personal animal', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.createRecord(
          'animal-1',
          { userId: 'user-2', role: 'USER' },
          {
            date: '2024-01-01',
          },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.fosterRecord.create).not.toHaveBeenCalled();
    });

    it('creates at most six images when the animal exists', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'user-1',
      });
      const created = {
        id: 'record-1',
        animalId: 'animal-1',
        date: new Date('2024-01-01T00:00:00.000Z'),
        content: 'daily log',
        createdAt: new Date('2024-01-01T01:00:00.000Z'),
        updatedAt: new Date('2024-01-01T01:00:00.000Z'),
        images: [],
      };
      prisma.fosterRecord.create.mockResolvedValueOnce(created as any);

      await expect(
        service.createRecord(
          'animal-1',
          { userId: 'user-1', role: 'USER' },
          {
            date: '2024-01-01',
            content: 'daily log',
            images: Array.from({ length: 8 }, (_, i) => `https://img/${String(i)}`),
          },
        ),
      ).resolves.toEqual(created);
      expect(prisma.fosterRecord.create).toHaveBeenCalledWith({
        data: {
          animalId: 'animal-1',
          date: new Date('2024-01-01'),
          content: 'daily log',
          images: {
            create: Array.from({ length: 6 }, (_, i) => ({
              url: `https://img/${String(i)}`,
              sortOrder: i,
            })),
          },
        },
        include: { images: true },
      });
    });

    it('throws NotFoundException when the animal does not exist', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createRecord(
          'animal-1',
          { userId: 'user-1', role: 'USER' },
          { date: '2024-01-01' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRecord', () => {
    it('throws NotFoundException when the record does not exist', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the animal information is missing', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the user lacks permission', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-2',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.fosterRecord.delete).not.toHaveBeenCalled();
    });

    it('returns the deletion result when removal succeeds', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'user-1',
      });
      prisma.fosterRecord.delete.mockResolvedValueOnce(undefined);

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).resolves.toEqual({
        animalId: 'animal-1',
        id: 'record-1',
        deleted: true,
      });
      expect(prisma.fosterRecord.delete).toHaveBeenCalledWith({
        where: { id: 'record-1' },
      });
    });

    it('throws NotFoundException when the record belongs to another animal', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-2',
      });

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAnimal', () => {
    it('throws NotFoundException when the animal cannot be found', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for organization animals when user is not ORG_ADMIN', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      });

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for personal animals when user is not the owner', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'user-2',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.delete).not.toHaveBeenCalled();
    });

    it('deletes the animal when all conditions are met', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });
      prisma.animal.delete.mockResolvedValueOnce(undefined);

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'owner-1',
          role: 'USER',
        }),
      ).resolves.toEqual({ id: 'animal-1', deleted: true });
      expect(prisma.animal.delete).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
      });
    });
  });

  describe('getRecord', () => {
    it('returns record data along with animal metadata', async () => {
      const { service, prisma } = build();
      const record = {
        id: 'record-1',
        animalId: 'animal-1',
        date: new Date('2024-01-05T00:00:00.000Z'),
        content: 'daily note',
        createdAt: new Date('2024-01-05T00:00:00.000Z'),
        updatedAt: new Date('2024-01-06T00:00:00.000Z'),
        images: [{ id: 'img-1', url: 'https://img/1', sortOrder: 0 }],
      } as any;
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(record);
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        name: 'Buddy',
        status: 'WAITING',
        shared: true,
        organization: { id: 'org-1', name: 'Foster Org' },
      });

      await expect(service.getRecord('animal-1', 'record-1')).resolves.toEqual({
        id: 'record-1',
        animalId: 'animal-1',
        date: record.date,
        content: record.content,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        images: [{ id: 'img-1', url: 'https://img/1', sortOrder: 0 }],
        animal: {
          id: 'animal-1',
          name: 'Buddy',
          status: 'WAITING',
          shared: true,
          organization: { id: 'org-1', name: 'Foster Org' },
        },
      });
    });

    it('throws NotFoundException when the record is missing or belongs to another animal', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(null);

      await expect(service.getRecord('animal-1', 'record-1')).rejects.toThrow(
        NotFoundException,
      );

      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-2',
        images: [],
      });

      await expect(service.getRecord('animal-1', 'record-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the animal is missing', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
        images: [],
      });
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(service.getRecord('animal-1', 'record-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRecord (additional branches)', () => {
    it('throws NotFoundException when the record belongs to another animal', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-2',
      });

      await expect(
        service.updateRecord(
          'animal-1',
          'record-1',
          {
            userId: 'user-1',
            role: 'ORG_ADMIN',
          },
          {},
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('skips image operations when updating without images', async () => {
      const { service, prisma } = build();
      const record = { id: 'record-1', animalId: 'animal-1' };
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(record);
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'user-1',
      });
      const tx = {
        fosterRecord: {
          update: jest.fn().mockResolvedValueOnce({ ...record, content: 'updated' }),
        },
        fosterRecordImage: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValueOnce([]),
        },
      };
      prisma.$transaction.mockImplementation((cb: (client: typeof tx) => unknown) =>
        Promise.resolve(cb(tx)),
      );

      await service.updateRecord(
        'animal-1',
        'record-1',
        { userId: 'user-1', role: 'USER' },
        { content: 'updated' },
      );

      expect(tx.fosterRecord.update).toHaveBeenCalled();
      expect(tx.fosterRecordImage.deleteMany).not.toHaveBeenCalled();
      expect(tx.fosterRecordImage.createMany).not.toHaveBeenCalled();
    });
  });
});
