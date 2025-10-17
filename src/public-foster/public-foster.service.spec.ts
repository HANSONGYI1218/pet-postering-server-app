import type {
  AnimalEnvironmentTagType,
  AnimalGender,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalStatus,
  AnimalType,
} from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import { PublicFosterService } from './public-foster.service';

interface PrismaMock {
  animal: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  fosterRecord: {
    findFirst: jest.Mock;
  };
}

describe('PublicFosterService', () => {
  const build = (): { service: PublicFosterService; prisma: PrismaMock } => {
    const prisma: PrismaMock = {
      animal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      fosterRecord: {
        findFirst: jest.fn(),
      },
    };
    const service = new PublicFosterService(prisma as unknown as PrismaService);
    return { service, prisma };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-08-12T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists animals with foster days', async () => {
    const { service, prisma } = build();
    const animal = {
      id: 'a-1',
      name: 'Buddy',
      status: 'WAITING' as AnimalStatus,
      shared: false,
      createdAt: new Date('2024-08-01T00:00:00.000Z'),
      type: 'DOG' as AnimalType,
      size: 'SMALL' as AnimalSize,
      gender: 'MALE' as AnimalGender,
      breed: 'Jindo',
      birthDate: new Date('2024-01-01T00:00:00.000Z'),
      mainImageUrl: null,
      introduction: null,
      remark: null,
      emergency: false,
      emergencyReason: null,
      euthanasiaDate: null,
      isFosterCondition: false,
      currentFosterStartDate: null,
      currentFosterEndDate: null,
      organization: {
        id: 'org-1',
        name: 'Org',
        address: 'addr',
        addressDetail: null,
        phoneNumber: null,
        donationBankName: null,
        donationAccountNumber: null,
        donationAccountHolder: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      images: [
        {
          id: 'img-1',
          animalId: 'a-1',
          url: 'https://image/1',
          sortOrder: 0,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
      healthTags: [{ animalId: 'a-1', value: 'NEUTERED' as AnimalHealthTagType }],
      personalityTags: [{ animalId: 'a-1', value: 'QUIET' as AnimalPersonalityTagType }],
      environmentTags: [
        {
          animalId: 'a-1',
          value: 'QUIET_ENVIRONMENT' as AnimalEnvironmentTagType,
        },
      ],
      specialNoteTags: [],
    };
    prisma.animal.findMany.mockResolvedValueOnce([animal]);
    prisma.fosterRecord.findFirst.mockResolvedValueOnce({
      date: new Date('2024-08-05T00:00:00.000Z'),
    });

    const result = await service.listAnimals();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'a-1',
      fosterDays: 7,
      healthTags: ['NEUTERED'],
    });
    expect(prisma.animal.findMany).toHaveBeenCalled();
  });

  it('returns detail or throws when missing', async () => {
    const { service, prisma } = build();
    prisma.animal.findUnique.mockResolvedValueOnce(null);

    await expect(service.getAnimal('missing')).rejects.toThrow('public-animal-not-found');

    const animal = {
      id: 'a-1',
      name: 'Buddy',
      status: 'WAITING' as AnimalStatus,
      shared: false,
      createdAt: new Date('2024-08-01T00:00:00.000Z'),
      type: 'DOG' as AnimalType,
      size: 'SMALL' as AnimalSize,
      gender: 'MALE' as AnimalGender,
      breed: 'Jindo',
      birthDate: new Date('2024-01-01T00:00:00.000Z'),
      mainImageUrl: null,
      introduction: 'intro',
      remark: 'remark',
      emergency: false,
      emergencyReason: null,
      euthanasiaDate: null,
      isFosterCondition: false,
      currentFosterStartDate: null,
      currentFosterEndDate: null,
      organization: null,
      images: [
        {
          id: 'img-1',
          animalId: 'a-1',
          url: 'https://image/1',
          sortOrder: 0,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
      healthTags: [],
      personalityTags: [],
      environmentTags: [],
      specialNoteTags: [],
    };
    prisma.animal.findUnique.mockResolvedValueOnce(animal);

    const detail = await service.getAnimal('a-1');

    expect(detail).toMatchObject({
      id: 'a-1',
      images: ['https://image/1'],
      introduction: 'intro',
    });
  });
});
