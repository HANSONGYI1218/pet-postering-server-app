import type {
  Animal,
  AnimalImage,
  AnimalStatus,
  FosterRecord,
  FosterRecordImage,
  Organization,
} from '@prisma/client';

import { calculateElapsedDays } from '../../foster/domain/metrics';
import type {
  FosterState,
  PublicRecordAnimal,
  PublicRecordDetail,
} from '../application/record.types';
import { sortedImageUrls } from './image-sorting';

const RECORD_STATE_MAP: Record<AnimalStatus, FosterState> = {
  WAITING: 'IN_PROGRESS',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'FOSTERED',
};

const toIsoString = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const calculateDuration = (
  start: Date | null,
  end: Date | null,
  now: Date = new Date(),
): number => {
  if (!start) return 0;
  return calculateElapsedDays(start, end ?? now);
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
  images: sortedImageUrls(animal.images),
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
      images: sortedImageUrls(animal.images),
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
      images: sortedImageUrls(record.images),
    })),
});
