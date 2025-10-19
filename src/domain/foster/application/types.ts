import type { AnimalStatus } from '@prisma/client';

export interface AnimalListItem {
  id: string;
  name: string;
  status: AnimalStatus;
  shared: boolean;
  orgId: string | null;
  ownerUserId: string | null;
  fosterDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListAnimalsResult {
  items: AnimalListItem[];
}

export interface FosterRecordImageView {
  id: string;
  url: string;
  sortOrder: number | null;
}

export interface FosterRecordBase {
  id: string;
  animalId: string;
  date: Date;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  images: FosterRecordImageView[];
}

export interface FosterRecordAnimalMeta {
  id: string;
  name: string;
  status: AnimalStatus;
  shared: boolean;
  organization: { id: string; name: string } | null;
}

export interface FosterRecordDetail extends FosterRecordBase {
  animal: FosterRecordAnimalMeta;
}

export interface ListRecordsResult {
  animalId: string;
  animal: FosterRecordAnimalMeta;
  from: string;
  to: string;
  items: FosterRecordBase[];
}

export interface DeleteAnimalResult {
  id: string;
  deleted: true;
}

export interface DeleteRecordResult {
  animalId: string;
  id: string;
  deleted: true;
}
