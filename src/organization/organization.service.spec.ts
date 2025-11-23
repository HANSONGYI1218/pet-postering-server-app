import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { OrganizationService } from './organization.service';

const build = () => {
  const prisma = {
    animal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fosterApplication: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (client: typeof prisma) => unknown) =>
    Promise.resolve(cb(prisma)),
  );
  const service = new OrganizationService(prisma as unknown as PrismaService);
  return { service, prisma };
};

const baseDate = new Date('2024-01-01T00:00:00.000Z');

describe('OrganizationService', () => {
  describe('listAnimals', () => {
    it('returns mapped animals with default fields', async () => {
      const { service, prisma } = build();
      prisma.animal.findMany.mockResolvedValueOnce([
        {
          id: 'animal-1',
          name: 'Buddy',
          type: 'DOG',
          size: 'SMALL',
          gender: 'MALE',
          breed: 'Beagle',
          birthDate: baseDate,
          status: 'IN_PROGRESS',
          mainImageUrl: 'https://example.com/image.jpg',
          emergency: false,
          healthTags: [{ value: 'NEUTERED' }],
          personalityTags: [{ value: 'QUIET' }],
          environmentTags: [{ value: 'QUIET_ENVIRONMENT' }],
          applications: [
            {
              id: 'apply-1',
              applicantName: 'Minji Kim',
              email: 'minji@example.com',
              phoneNumber: '010-1234-5678',
              address: 'Mapo-gu, Seoul',
              addressDetail: 'Unit 201',
              introduction: 'Office worker available for walks.',
            },
          ],
        },
      ]);

      const result = await service.listAnimals();

      expect(prisma.animal.findMany).toHaveBeenCalledWith({
        where: { orgId: { not: null } },
        orderBy: { createdAt: 'desc' },
        include: {
          healthTags: true,
          personalityTags: true,
          environmentTags: true,
          applications: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'animal-1',
        name: 'Buddy',
        type: 'DOG',
        imageUrl: 'https://example.com/image.jpg',
        applicants: [
          {
            id: 'apply-1',
            name: 'Minji Kim',
            email: 'minji@example.com',
            phoneNumber: '010-1234-5678',
          },
        ],
        fosterApplyNumber: 1,
        status: 'IN_PROGRESS',
      });
    });

    it('preserves COMPLETED status for finished animals', async () => {
      const { service, prisma } = build();
      prisma.animal.findMany.mockResolvedValueOnce([
        {
          id: 'animal-2',
          name: 'Happy',
          type: 'DOG',
          size: 'SMALL',
          gender: 'FEMALE',
          breed: 'Poodle',
          birthDate: baseDate,
          status: 'COMPLETED',
          mainImageUrl: null,
          emergency: false,
          healthTags: [],
          personalityTags: [],
          environmentTags: [],
          applications: [],
        },
      ]);

      const result = await service.listAnimals();

      expect(result.items[0].status).toBe('COMPLETED');
    });
  });

  describe('getAnimal', () => {
    it('throws NotFound when animal missing', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(service.getAnimal('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns mapped detail when animal exists', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        name: 'Buddy',
        type: 'DOG',
        size: 'SMALL',
        gender: 'MALE',
        breed: 'Beagle',
        birthDate: baseDate,
        status: 'IN_PROGRESS',
        mainImageUrl: 'https://example.com/image.jpg',
        emergency: true,
        emergencyReason: 'Need home',
        introduction: 'Friendly dog',
        remark: null,
        currentFosterStartDate: baseDate,
        currentFosterEndDate: null,
        healthTags: [{ value: 'NEUTERED' }],
        personalityTags: [{ value: 'QUIET' }],
        environmentTags: [{ value: 'QUIET_ENVIRONMENT' }],
        specialNoteTags: [{ value: 'SEPARATION_ANXIETY' }],
        applications: [
          {
            id: 'apply-1',
            applicantName: 'Minji Kim',
            email: 'minji@example.com',
            phoneNumber: '010-1234-5678',
            address: 'Seoul',
            addressDetail: 'Unit 201',
            introduction: 'Office worker available for walks.',
          },
        ],
        organization: {
          id: 'org-1',
          name: 'Pet Org',
          phoneNumber: '010-1234-5678',
          address: 'Seoul',
          addressDetail: null,
          donationBankName: null,
          donationAccountNumber: null,
          donationAccountHolder: null,
        },
        images: [{ url: 'https://example.com/image.jpg' }],
        records: [
          {
            id: 'record-1',
            content: 'Healthy',
            healthNote: null,
            createdAt: baseDate,
            updatedAt: baseDate,
            images: [{ url: 'https://example.com/record.jpg' }],
          },
        ],
      });

      const result = await service.getAnimal('animal-1');

      expect(prisma.animal.findUnique).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
        include: {
          organization: true,
          healthTags: true,
          personalityTags: true,
          environmentTags: true,
          specialNoteTags: true,
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          records: {
            orderBy: { date: 'desc' },
            include: {
              images: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          applications: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(result).toMatchObject({
        id: 'animal-1',
        isEmergency: true,
        organization: {
          id: 'org-1',
          name: 'Pet Org',
        },
        fosterRecords: [
          {
            id: 'record-1',
            images: ['https://example.com/record.jpg'],
          },
        ],
        applicants: [
          {
            id: 'apply-1',
            name: 'Minji Kim',
            email: 'minji@example.com',
            phoneNumber: '010-1234-5678',
          },
        ],
        fosterApplyNumber: 1,
      });
    });
  });

  describe('acceptApplication', () => {
    const adminUser = { userId: 'admin-1', role: 'ORG_ADMIN' };

    it('blocks non-admin users', async () => {
      const { service } = build();

      await expect(
        service.acceptApplication({ userId: 'user-1', role: 'USER' }, 'app-1'),
      ).rejects.toThrow('org-admin-only');
    });

    it('throws when application missing', async () => {
      const { service, prisma } = build();
      prisma.fosterApplication.findUnique.mockResolvedValueOnce(null);

      await expect(service.acceptApplication(adminUser, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when application animal is not organization-owned', async () => {
      const { service, prisma } = build();
      prisma.fosterApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        animalId: 'animal-1',
        animal: { orgId: null },
      });

      await expect(service.acceptApplication(adminUser, 'app-1')).rejects.toThrow(
        'application-not-organization',
      );
    });

    it('updates status, ownerUserId, startDate within transaction', async () => {
      const { service, prisma } = build();
      const baseDate = new Date('2025-11-23T00:00:00.000Z');
      jest.useFakeTimers().setSystemTime(baseDate);
      prisma.fosterApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        animalId: 'animal-1',
        userId: 'user-77',
        animal: { orgId: 'org-1', status: 'WAITING' },
      });

      await service.acceptApplication(adminUser, 'app-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.animal.update).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
        data: {
          status: 'IN_PROGRESS',
          currentFosterStartDate: baseDate,
          ownerUserId: 'user-77',
        },
      });
      jest.useRealTimers();
    });

    it('rejects when application has no userId (guest applications not allowed)', async () => {
      const { service, prisma } = build();
      prisma.fosterApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        animalId: 'animal-1',
        userId: null,
        animal: { orgId: 'org-1', status: 'WAITING' },
      });

      await expect(service.acceptApplication(adminUser, 'app-1')).rejects.toThrow(
        'application-user-missing',
      );
    });

    it('rejects when animal is already in progress or completed', async () => {
      const { service, prisma } = build();
      prisma.fosterApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        animalId: 'animal-1',
        userId: 'user-77',
        animal: { orgId: 'org-1', status: 'IN_PROGRESS' },
      });

      await expect(service.acceptApplication(adminUser, 'app-1')).rejects.toThrow(
        'animal-already-fostered',
      );
    });
  });
});
