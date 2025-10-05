import type {
  Animal,
  AnimalImage,
  AnimalStatus,
  FosterRecord,
  FosterRecordImage,
  Organization,
} from '@prisma/client';

import type {
  FosterState,
  PublicRecordAnimal,
  PublicRecordDetail,
} from '../application/record.types';

const RECORD_STATE_MAP: Record<AnimalStatus, FosterState> = {
  WAITING: 'IN_PROGRESS',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'FOSTERED',
};

const toIsoString = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const sortImageUrls = (
  images: { sortOrder: number | null; url: string }[],
): string[] =>
  images
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((image) => image.url);

const calculateDuration = (start: Date | null, end: Date | null): number => {
  if (!start) return 0;
  const endDate = end ?? new Date();
  const diff = endDate.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const toRecordAnimal = (
  animal: Animal & { images: AnimalImage[] },
): PublicRecordAnimal => ({
  id: animal.id,
  name: animal.name,
  type: animal.type,
  breed: animal.breed ?? null,
  birthDate: toIsoString(animal.birthDate),
  gender: animal.gender ?? null,
  images: sortImageUrls(animal.images),
  fosterDuration: calculateDuration(
    animal.currentFosterStartDate,
    animal.currentFosterEndDate,
  ),
  state: RECORD_STATE_MAP[animal.status],
  matchId: animal.id,
});

export const toRecordDetail = ({
  animal,
  records,
}: {
  animal: Animal & {
    images: AnimalImage[];
    organization: Organization | null;
  };
  records: (FosterRecord & { images: FosterRecordImage[] })[];
}): PublicRecordDetail => ({
  id: animal.id,
  info: {
    id: animal.id,
    state: RECORD_STATE_MAP[animal.status],
    createdAt: animal.createdAt.toISOString(),
    organization: animal.organization
      ? {
          id: animal.organization.id,
          name: animal.organization.name,
          phoneNumber: animal.organization.phoneNumber ?? null,
          zipcode: animal.organization.zipcode ?? null,
          address: animal.organization.address ?? null,
          addressDetail: animal.organization.addressDetail ?? null,
          email: animal.organization.email ?? null,
        }
      : null,
    animal: {
      name: animal.name,
      type: animal.type,
      breed: animal.breed ?? null,
      birthDate: toIsoString(animal.birthDate),
      gender: animal.gender ?? null,
      remark: animal.remark ?? null,
      images: sortImageUrls(animal.images),
    },
  },
  records: records
    .slice()
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map((record) => ({
      id: record.id,
      content: record.content ?? '',
      healthNote: record.healthNote ?? '',
      createdAt: record.date.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      images: sortImageUrls(record.images),
    })),
});
