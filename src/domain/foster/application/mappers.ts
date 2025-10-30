import type {
  Animal,
  FosterRecord,
  FosterRecordImage,
  Organization,
} from '@prisma/client';

import type { AnimalListItem, FosterRecordAnimalMeta, FosterRecordBase } from './types';

export const toAnimalListItem = (animal: Animal, fosterDays: number): AnimalListItem => ({
  id: animal.id,
  name: animal.name,
  status: animal.status,
  shared: animal.shared,
  orgId: animal.orgId,
  ownerUserId: animal.ownerUserId,
  fosterDays,
  createdAt: animal.createdAt,
  updatedAt: animal.updatedAt,
});

export const toFosterRecordBase = (
  record: FosterRecord,
  images: FosterRecordImage[],
): FosterRecordBase => ({
  id: record.id,
  animalId: record.animalId,
  date: record.date,
  content: record.content,
  healthNote: record.healthNote ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  images: images.map((image) => ({
    id: image.id,
    url: image.url,
    sortOrder: image.sortOrder,
  })),
});

const toOrganizationMeta = (
  organization: Pick<Organization, 'id' | 'name'> | null,
): { id: string; name: string } | null =>
  organization ? { id: organization.id, name: organization.name } : null;

export const toFosterRecordAnimalMeta = (
  animal: Animal & { organization: Pick<Organization, 'id' | 'name'> | null },
): FosterRecordAnimalMeta => ({
  id: animal.id,
  name: animal.name,
  status: animal.status,
  shared: animal.shared,
  organization: toOrganizationMeta(animal.organization),
});
