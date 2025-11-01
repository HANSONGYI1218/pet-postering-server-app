import type {
  Animal,
  AnimalImage,
  AnimalStatus,
  FosterRecord,
  FosterRecordImage,
  Organization,
} from '@prisma/client';

import { calculateElapsedDays } from '../../foster/domain/metrics';
import type { PublicRecordAnimal, PublicRecordDetail } from '../application/record.types';
import { sortedImageUrls } from './image-sorting';

const RECORD_STATE_MAP: Record<AnimalStatus, AnimalStatus> = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const toIsoString = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const calculateDuration = (start: Date | null, end: Date | null, now: Date): number => {
  if (!start) {
    return 0;
  }
  return calculateElapsedDays(start, end ?? now);
};

const mapOrganization = (
  organization: Organization | null,
): PublicRecordDetail['info']['organization'] =>
  organization
    ? {
        id: organization.id,
        name: organization.name,
        phoneNumber: organization.phoneNumber ?? null,
        zipcode: organization.zipcode ?? null,
        address: organization.address ?? null,
        addressDetail: organization.addressDetail ?? null,
        email: organization.email ?? null,
      }
    : null;

const mapAnimalDetail = (
  animal: Animal & {
    images: AnimalImage[];
  },
): PublicRecordDetail['info']['animal'] => ({
  name: animal.name,
  type: animal.type,
  breed: animal.breed ?? null,
  birthDate: toIsoString(animal.birthDate),
  gender: animal.gender ?? null,
  introduction: animal.introduction ?? null,
  remark: animal.remark ?? null,
  images: sortedImageUrls(animal.images),
  currentFosterStartDate: toIsoString(animal.currentFosterStartDate),
  currentFosterEndDate: toIsoString(animal.currentFosterEndDate),
});

const mapRecordEntry = (
  record: FosterRecord & { images: FosterRecordImage[] },
): PublicRecordDetail['records'][number] => ({
  id: record.id,
  content: record.content ?? null,
  healthNote: record.healthNote ?? null,
  createdAt: record.date.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  images: sortedImageUrls(record.images),
});

export const toRecordAnimal = (
  animal: Animal & { images: AnimalImage[] },
  options: { now?: Date } = {},
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
    options.now ?? new Date(),
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
    organization: mapOrganization(animal.organization),
    animal: mapAnimalDetail(animal),
  },
  records: records
    .slice()
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map(mapRecordEntry),
});
