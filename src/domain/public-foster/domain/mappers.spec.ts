import type {
  AnimalEnvironmentTag,
  AnimalEnvironmentTagType,
  AnimalGender,
  AnimalHealthTag,
  AnimalHealthTagType,
  AnimalImage,
  AnimalPersonalityTag,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTag,
  AnimalSpecialNoteTagType,
  AnimalStatus,
  AnimalType,
  Organization,
} from '@prisma/client';

import {
  type RawAnimal,
  toPublicFosterDetail,
  toPublicFosterListItem,
} from './mappers';

const createAnimal = (overrides: Partial<RawAnimal> = {}): RawAnimal => {
  const organization: Organization = {
    id: 'org-1',
    name: 'Org',
    address: 'addr',
    addressDetail: 'addr-detail',
    phoneNumber: '010-0000-0000',
    donationBankName: 'bank',
    donationAccountNumber: '1234',
    donationAccountHolder: 'holder',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };
  const defaultAnimal = {
    id: 'animal-1',
    name: 'Buddy',
    status: 'WAITING' as AnimalStatus,
    shared: false,
    orgId: organization.id,
    ownerUserId: null,
    type: 'DOG' as AnimalType,
    size: 'MEDIUM' as AnimalSize,
    gender: 'MALE' as AnimalGender,
    breed: 'Jindo',
    birthDate: new Date('2023-01-01T00:00:00.000Z'),
    mainImageUrl: null,
    introduction: 'intro',
    remark: 'remark',
    emergency: true,
    emergencyReason: 'reason',
    currentFosterStartDate: new Date('2024-06-01T00:00:00.000Z'),
    currentFosterEndDate: new Date('2024-07-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    organization,
    images: [
      {
        id: 'image-1',
        animalId: 'animal-1',
        url: 'https://example.com/a.jpg',
        sortOrder: 2,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        id: 'image-2',
        animalId: 'animal-1',
        url: 'https://example.com/b.jpg',
        sortOrder: 1,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ] satisfies AnimalImage[],
    healthTags: [
      { animalId: 'animal-1', value: 'NEUTERED' as AnimalHealthTagType },
    ] satisfies AnimalHealthTag[],
    personalityTags: [
      { animalId: 'animal-1', value: 'QUIET' as AnimalPersonalityTagType },
      { animalId: 'animal-1', value: 'ENERGETIC' as AnimalPersonalityTagType },
    ] satisfies AnimalPersonalityTag[],
    environmentTags: [
      {
        animalId: 'animal-1',
        value: 'QUIET_ENVIRONMENT' as AnimalEnvironmentTagType,
      },
    ] satisfies AnimalEnvironmentTag[],
    specialNoteTags: [
      {
        animalId: 'animal-1',
        value: 'POTTY_ACCIDENTS' as AnimalSpecialNoteTagType,
      },
    ] satisfies AnimalSpecialNoteTag[],
  } satisfies RawAnimal;

  return {
    ...defaultAnimal,
    ...overrides,
  } satisfies RawAnimal;
};

describe('public foster mappers', () => {
  it('builds list item with calculated foster days', () => {
    const animal = createAnimal({
      mainImageUrl: 'https://example.com/main.jpg',
    });

    const result = toPublicFosterListItem(animal, 42);

    expect(result).toMatchObject({
      id: 'animal-1',
      name: 'Buddy',
      mainImageUrl: 'https://example.com/main.jpg',
      healthTags: ['NEUTERED'],
      personalityTags: ['QUIET', 'ENERGETIC'],
      environmentTags: ['QUIET_ENVIRONMENT'],
      fosterDays: 42,
      organization: {
        id: 'org-1',
        name: 'Org',
        address: 'addr',
        donationAccountHolder: 'holder',
      },
    });
  });

  it('sorts images and exposes detail fields', () => {
    const animal = createAnimal();

    const result = toPublicFosterDetail(animal);

    expect(result.images).toEqual([
      'https://example.com/b.jpg',
      'https://example.com/a.jpg',
    ]);
    expect(result.specialNoteTags).toEqual(['POTTY_ACCIDENTS']);
    expect(result.currentFosterStartDate).toBe('2024-06-01T00:00:00.000Z');
    expect(result.currentFosterEndDate).toBe('2024-07-01T00:00:00.000Z');
  });

  it('falls back to first image if mainImageUrl missing', () => {
    const animal = createAnimal({ mainImageUrl: null });

    const result = toPublicFosterListItem(animal, 7);

    expect(result.mainImageUrl).toBe('https://example.com/b.jpg');
  });

  it('handles missing organization gracefully', () => {
    const animal = createAnimal({ organization: null });

    const result = toPublicFosterListItem(animal, 0);

    expect(result.organization).toBeNull();
  });
});
