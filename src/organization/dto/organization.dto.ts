import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnimalEnvironmentTagType,
  AnimalGender,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalStatus,
  AnimalType,
} from '@prisma/client';

export class OrganizationApplicantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  phoneNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressDetail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  introduction?: string | null;
}

export class OrganizationAnimalDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: AnimalType, nullable: true })
  type?: AnimalType | null;

  @ApiPropertyOptional({ enum: AnimalSize, nullable: true })
  size?: AnimalSize | null;

  @ApiPropertyOptional({ enum: AnimalGender, nullable: true })
  gender?: AnimalGender | null;

  @ApiPropertyOptional({ nullable: true })
  breed?: string | null;

  @ApiPropertyOptional({ nullable: true })
  birthDate?: string | null;

  @ApiProperty({ enum: AnimalStatus, enumName: 'AnimalStatus' })
  status!: AnimalStatus;

  @ApiPropertyOptional({ nullable: true })
  imageUrl?: string | null;

  @ApiProperty()
  isEmergency!: boolean;

  @ApiProperty({ type: () => [OrganizationApplicantDto] })
  applicants!: OrganizationApplicantDto[];

  @ApiProperty({ isArray: true, enum: AnimalHealthTagType })
  healthTags!: AnimalHealthTagType[];

  @ApiProperty({ isArray: true, enum: AnimalPersonalityTagType })
  personalityTags!: AnimalPersonalityTagType[];

  @ApiProperty({ isArray: true, enum: AnimalEnvironmentTagType })
  environmentTags!: AnimalEnvironmentTagType[];

  @ApiProperty()
  fosterApplyNumber!: number;
}

export class OrganizationAnimalListResponseDto {
  @ApiProperty({ type: () => [OrganizationAnimalDto] })
  items!: OrganizationAnimalDto[];
}

export class OrganizationMetaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  phoneNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressDetail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  donationBankName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  donationAccountNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  donationAccountHolder?: string | null;
}

export class OrganizationFosterRecordDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  content?: string | null;

  @ApiPropertyOptional({ nullable: true })
  healthNote?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: () => [String] })
  images!: string[];
}

export class OrganizationAnimalDetailDto extends OrganizationAnimalDto {
  @ApiPropertyOptional({ nullable: true })
  introduction?: string | null;

  @ApiPropertyOptional({ nullable: true })
  remark?: string | null;

  @ApiProperty({ type: () => [String] })
  images!: string[];

  @ApiPropertyOptional({ nullable: true })
  emergencyReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentFosterStartDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentFosterEndDate?: string | null;

  @ApiProperty({ isArray: true, enum: AnimalSpecialNoteTagType })
  specialNoteTags!: AnimalSpecialNoteTagType[];

  @ApiPropertyOptional({ type: () => OrganizationMetaDto, nullable: true })
  organization?: OrganizationMetaDto | null;

  @ApiProperty({ type: () => [OrganizationFosterRecordDto] })
  fosterRecords!: OrganizationFosterRecordDto[];
}
