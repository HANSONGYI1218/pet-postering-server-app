import type {
  Animal,
  AnimalStatus,
  FosterRecord,
  FosterRecordImage,
} from '@prisma/client';

export interface AnimalListItem extends Animal {
  fosterDays: number;
}

export interface ListAnimalsResult {
  items: AnimalListItem[];
}

export interface FosterRecordBase extends FosterRecord {
  images: FosterRecordImage[];
}

export interface FosterRecordDetail extends FosterRecordBase {
  animal?: {
    id: string;
    name: string;
    status: AnimalStatus;
    shared: boolean;
    organization: { id: string; name: string } | null;
  };
}

export interface ListRecordsResult {
  animalId: string;
  animal: {
    id: string;
    name: string;
    status: AnimalStatus;
    shared: boolean;
    organization: { id: string; name: string } | null;
  };
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
