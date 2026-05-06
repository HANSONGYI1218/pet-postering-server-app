import type {
  AnimalEnvironmentTagType,
  AnimalGender,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalStatus,
  AnimalType,
  Organization,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

import type {
  PublicFosterAnimalDetail,
  PublicFosterAnimalListItem,
  PublicFosterOrganization,
} from '../application/types';
import { firstImageUrlOrNull, sortedImageUrls } from './image-sorting';

const rawAnimalArgs = Prisma.validator<Prisma.AnimalDefaultArgs>()({
  include: {
    organization: true,
    images: true,
    healthTags: true,
    personalityTags: true,
    environmentTags: true,
    specialNoteTags: true,
  },
});

export type RawAnimal = Prisma.AnimalGetPayload<typeof rawAnimalArgs>;

export const PUBLIC_FOSTER_ANIMAL_INCLUDE = rawAnimalArgs.include;

export const PUBLIC_FOSTER_ANIMAL_QUERY = Prisma.validator<Prisma.AnimalFindManyArgs>()({
  include: PUBLIC_FOSTER_ANIMAL_INCLUDE,
});

export const toNullSafeIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export const pluckTagValues = <TValue extends string>(
  tags: { value: TValue }[],
): TValue[] => tags.map((tag) => tag.value);

export const toOrganization = (
  organization: Organization | null,
): PublicFosterOrganization | null => {
  if (!organization) {
    return null;
  }

  return {
    id: organization.id,
    name: organization.name,
    address: organization.address,
    addressDetail: organization.addressDetail,
    phoneNumber: organization.phoneNumber,
    donationBankName: organization.donationBankName,
    donationAccountNumber: organization.donationAccountNumber,
    donationAccountHolder: organization.donationAccountHolder,
  } satisfies PublicFosterOrganization;
};

export const toBase = (
  animal: RawAnimal,
): {
  id: string;
  name: string;
  type?: AnimalType | null;
  size?: AnimalSize | null;
  gender?: AnimalGender | null;
  breed?: string | null;
  birthDate?: string | null;
  status: AnimalStatus;
  shared: boolean;
  mainImageUrl?: string | null;
  isEmergency: boolean;
  euthanasiaDate?: string | null;
  isFosterCondition: boolean;
  emergencyReason?: string | null;
  organization: PublicFosterOrganization | null;
  healthTags: AnimalHealthTagType[];
  personalityTags: AnimalPersonalityTagType[];
  environmentTags: AnimalEnvironmentTagType[];
} => ({
  id: animal.id,
  name: animal.name,
  type: animal.type,
  size: animal.size,
  gender: animal.gender,
  breed: animal.breed,
  birthDate: toNullSafeIsoString(animal.birthDate),
  status: animal.status,
  shared: animal.shared,
  mainImageUrl: animal.mainImageUrl ?? firstImageUrlOrNull(animal.images),
  isEmergency: animal.emergency,
  euthanasiaDate: toNullSafeIsoString(animal.euthanasiaDate),
  isFosterCondition: animal.isFosterCondition,
  emergencyReason: animal.emergencyReason,
  organization: toOrganization(animal.organization),
  healthTags: pluckTagValues<AnimalHealthTagType>(animal.healthTags),
  personalityTags: pluckTagValues<AnimalPersonalityTagType>(animal.personalityTags),
  environmentTags: pluckTagValues<AnimalEnvironmentTagType>(animal.environmentTags),
});

export const toPublicFosterListItem = (
  animal: RawAnimal,
  fosterDays: number,
): PublicFosterAnimalListItem => ({
  ...toBase(animal),
  fosterDays,
});

export const toPublicFosterDetail = (animal: RawAnimal): PublicFosterAnimalDetail => ({
  ...toBase(animal),
  introduction: animal.introduction,
  remark: animal.remark,
  images: sortedImageUrls(animal.images),
  specialNoteTags: pluckTagValues<AnimalSpecialNoteTagType>(animal.specialNoteTags),
  currentFosterStartDate: toNullSafeIsoString(animal.currentFosterStartDate),
  currentFosterEndDate: toNullSafeIsoString(animal.currentFosterEndDate),
});
