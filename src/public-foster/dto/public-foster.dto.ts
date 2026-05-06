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

export class PublicFosterOrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  addressDetail?: string | null;

  @ApiPropertyOptional()
  phoneNumber?: string | null;

  @ApiPropertyOptional()
  donationBankName?: string | null;

  @ApiPropertyOptional()
  donationAccountNumber?: string | null;

  @ApiPropertyOptional()
  donationAccountHolder?: string | null;
}

export class PublicFosterAnimalBaseDto {
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

  @ApiProperty({ enum: AnimalStatus })
  status!: AnimalStatus;

  @ApiProperty()
  shared!: boolean;

  @ApiPropertyOptional({ nullable: true })
  mainImageUrl?: string | null;

  @ApiProperty()
  isEmergency!: boolean;

  @ApiPropertyOptional({ nullable: true })
  euthanasiaDate?: string | null;

  @ApiProperty()
  isFosterCondition!: boolean;

  @ApiPropertyOptional({ nullable: true })
  emergencyReason?: string | null;

  @ApiPropertyOptional({
    type: () => PublicFosterOrganizationDto,
    nullable: true,
  })
  organization?: PublicFosterOrganizationDto | null;

  @ApiProperty({ isArray: true, enum: AnimalHealthTagType })
  healthTags!: AnimalHealthTagType[];

  @ApiProperty({ isArray: true, enum: AnimalPersonalityTagType })
  personalityTags!: AnimalPersonalityTagType[];

  @ApiProperty({ isArray: true, enum: AnimalEnvironmentTagType })
  environmentTags!: AnimalEnvironmentTagType[];
}

export class PublicFosterAnimalListItemDto extends PublicFosterAnimalBaseDto {
  @ApiProperty()
  fosterDays!: number;
}

export class PublicFosterAnimalDetailDto extends PublicFosterAnimalBaseDto {
  @ApiPropertyOptional({ nullable: true })
  introduction?: string | null;

  @ApiPropertyOptional({ nullable: true })
  remark?: string | null;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiProperty({ isArray: true, enum: AnimalSpecialNoteTagType })
  specialNoteTags!: AnimalSpecialNoteTagType[];

  @ApiPropertyOptional({ nullable: true })
  currentFosterStartDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentFosterEndDate?: string | null;
}

export class PublicFosterAnimalListResponseDto {
  @ApiProperty({ type: () => [PublicFosterAnimalListItemDto] })
  items!: PublicFosterAnimalListItemDto[];
}
