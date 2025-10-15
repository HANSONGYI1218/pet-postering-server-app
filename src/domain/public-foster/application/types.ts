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

export interface PublicFosterOrganization {
  id: string;
  name: string;
  address?: string | null;
  addressDetail?: string | null;
  phoneNumber?: string | null;
  donationBankName?: string | null;
  donationAccountNumber?: string | null;
  donationAccountHolder?: string | null;
}

export interface PublicFosterAnimalBase {
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
}

export interface PublicFosterAnimalListItem extends PublicFosterAnimalBase {
  fosterDays: number;
}

export interface PublicFosterAnimalDetail extends PublicFosterAnimalBase {
  introduction?: string | null;
  remark?: string | null;
  images: string[];
  specialNoteTags: AnimalSpecialNoteTagType[];
  currentFosterStartDate?: string | null;
  currentFosterEndDate?: string | null;
}

export interface PublicFosterAnimalListResult {
  items: PublicFosterAnimalListItem[];
}
