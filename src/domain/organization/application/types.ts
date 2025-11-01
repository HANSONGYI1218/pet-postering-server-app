import type {
  AnimalEnvironmentTagType,
  AnimalGender,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalStatus,
  AnimalType,
} from '@prisma/client';

export interface OrganizationApplicant {
  id: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  addressDetail?: string | null;
  introduction?: string | null;
}

export interface OrganizationAnimalListItem {
  id: string;
  name: string;
  type?: AnimalType | null;
  size?: AnimalSize | null;
  gender?: AnimalGender | null;
  breed?: string | null;
  birthDate?: string | null;
  status: AnimalStatus;
  imageUrl?: string | null;
  isEmergency: boolean;
  applicants: OrganizationApplicant[];
  healthTags: AnimalHealthTagType[];
  personalityTags: AnimalPersonalityTagType[];
  environmentTags: AnimalEnvironmentTagType[];
  fosterApplyNumber: number;
}

export interface OrganizationAnimalListResult {
  items: OrganizationAnimalListItem[];
}

export interface OrganizationMeta {
  id: string;
  name: string;
  phoneNumber?: string | null;
  address?: string | null;
  addressDetail?: string | null;
  donationBankName?: string | null;
  donationAccountNumber?: string | null;
  donationAccountHolder?: string | null;
}

export interface OrganizationFosterRecord {
  id: string;
  content?: string | null;
  healthNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  images: string[];
}

export interface OrganizationAnimalDetail extends OrganizationAnimalListItem {
  introduction?: string | null;
  remark?: string | null;
  images: string[];
  emergencyReason?: string | null;
  currentFosterStartDate?: string | null;
  currentFosterEndDate?: string | null;
  specialNoteTags: AnimalSpecialNoteTagType[];
  organization?: OrganizationMeta | null;
  fosterRecords: OrganizationFosterRecord[];
}
