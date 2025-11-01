import type {
  Animal,
  AnimalEnvironmentTag,
  AnimalHealthTag,
  AnimalPersonalityTag,
  AnimalSpecialNoteTag,
  AnimalStatus,
  FosterApplication,
  FosterRecord,
  FosterRecordImage,
  Organization,
} from '@prisma/client';

import type {
  OrganizationAnimalDetail,
  OrganizationAnimalListItem,
  OrganizationApplicant,
  OrganizationFosterRecord,
  OrganizationMeta,
} from './types';

type AnimalWithTags = Animal & {
  healthTags: Pick<AnimalHealthTag, 'value'>[];
  personalityTags: Pick<AnimalPersonalityTag, 'value'>[];
  environmentTags: Pick<AnimalEnvironmentTag, 'value'>[];
  applications: Pick<
    FosterApplication,
    | 'id'
    | 'applicantName'
    | 'email'
    | 'phoneNumber'
    | 'address'
    | 'addressDetail'
    | 'introduction'
  >[];
};

type AnimalWithDetailRelations = AnimalWithTags & {
  specialNoteTags: Pick<AnimalSpecialNoteTag, 'value'>[];
  organization: Organization | null;
  images: { url: string }[];
  records: (FosterRecord & { images: Pick<FosterRecordImage, 'url'>[] })[];
};

const mapFosterStatus = (status: Animal['status'] | null | undefined): AnimalStatus => {
  if (status === 'WAITING') {
    return 'WAITING';
  }
  if (status === 'COMPLETED') {
    return 'COMPLETED';
  }
  return 'IN_PROGRESS';
};

const mapTags = <V>(collection: readonly { value: V }[]): V[] =>
  collection.map((item) => item.value);

const mapApplications = (
  applications: AnimalWithTags['applications'],
): OrganizationApplicant[] =>
  applications.map((application) => ({
    id: application.id,
    name: application.applicantName,
    email: application.email,
    phoneNumber: application.phoneNumber,
    address: application.address,
    addressDetail: application.addressDetail,
    introduction: application.introduction,
  }));

const toOrganizationMeta = (
  organization: Organization | null,
): OrganizationMeta | null =>
  organization
    ? {
        id: organization.id,
        name: organization.name,
        phoneNumber: organization.phoneNumber,
        address: organization.address,
        addressDetail: organization.addressDetail,
        donationBankName: organization.donationBankName,
        donationAccountNumber: organization.donationAccountNumber,
        donationAccountHolder: organization.donationAccountHolder,
      }
    : null;

export const toOrganizationAnimalListItem = (
  animal: AnimalWithTags,
): OrganizationAnimalListItem => ({
  id: animal.id,
  name: animal.name,
  type: animal.type ?? null,
  size: animal.size ?? null,
  gender: animal.gender ?? null,
  breed: animal.breed ?? null,
  birthDate: animal.birthDate?.toISOString() ?? null,
  status: mapFosterStatus(animal.status),
  imageUrl: animal.mainImageUrl ?? null,
  isEmergency: animal.emergency,
  applicants: mapApplications(animal.applications),
  healthTags: mapTags(animal.healthTags),
  personalityTags: mapTags(animal.personalityTags),
  environmentTags: mapTags(animal.environmentTags),
  fosterApplyNumber: animal.applications.length,
});

const toFosterRecord = (
  record: FosterRecord & { images: Pick<FosterRecordImage, 'url'>[] },
): OrganizationFosterRecord => ({
  id: record.id,
  content: record.content ?? null,
  healthNote: record.healthNote ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  images: record.images.map((image) => image.url),
});

export const toOrganizationAnimalDetail = (
  animal: AnimalWithDetailRelations,
): OrganizationAnimalDetail => ({
  ...toOrganizationAnimalListItem(animal),
  introduction: animal.introduction ?? null,
  remark: animal.remark ?? null,
  images:
    animal.images.length > 0
      ? animal.images.map((image) => image.url)
      : animal.mainImageUrl
        ? [animal.mainImageUrl]
        : [],
  emergencyReason: animal.emergencyReason ?? null,
  currentFosterStartDate: animal.currentFosterStartDate?.toISOString() ?? null,
  currentFosterEndDate: animal.currentFosterEndDate?.toISOString() ?? null,
  specialNoteTags: mapTags(animal.specialNoteTags),
  organization: toOrganizationMeta(animal.organization),
  fosterRecords: animal.records.map(toFosterRecord),
});
