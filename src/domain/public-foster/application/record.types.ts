import type { AnimalGender, AnimalType } from '@prisma/client';

export type FosterState = 'IN_PROGRESS' | 'FOSTERED' | 'ADOPTED';

export interface PublicRecordAnimal {
  id: string;
  name: string;
  type: AnimalType | null;
  breed: string | null;
  birthDate: string | null;
  gender: AnimalGender | null;
  images: string[];
  fosterDuration: number;
  state: FosterState;
  matchId: string;
}

export interface PublicRecordListResult {
  items: PublicRecordAnimal[];
}

export interface PublicRecordEntry {
  id: string;
  content: string | null;
  healthNote: string | null;
  createdAt: string;
  updatedAt: string;
  images: string[];
}

export interface PublicRecordDetail {
  id: string;
  info: {
    id: string;
    state: FosterState;
    createdAt: string;
    organization: {
      id: string;
      name: string;
      phoneNumber: string | null;
      zipcode: string | null;
      address: string | null;
      addressDetail: string | null;
      email: string | null;
    } | null;
    animal: {
      name: string;
      type: AnimalType | null;
      breed: string | null;
      birthDate: string | null;
      gender: AnimalGender | null;
      remark: string | null;
      images: string[];
    };
  };
  records: PublicRecordEntry[];
}
