import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnimalEnvironmentTagType,
  AnimalGender,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalType,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export enum AnimalStatusDto {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class CreateAnimalDto {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ description: 'Organization id if org-owned' })
  @IsOptional()
  @IsString()
  orgId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shared?: boolean;

  @ApiPropertyOptional({ enum: AnimalStatusDto })
  @IsOptional()
  @IsEnum(AnimalStatusDto)
  status?: AnimalStatusDto;

  @ApiPropertyOptional({ enum: AnimalType })
  @IsOptional()
  @IsEnum(AnimalType)
  type?: AnimalType;

  @ApiPropertyOptional({ enum: AnimalSize })
  @IsOptional()
  @IsEnum(AnimalSize)
  size?: AnimalSize;

  @ApiPropertyOptional({ enum: AnimalGender })
  @IsOptional()
  @IsEnum(AnimalGender)
  gender?: AnimalGender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 100)
  age?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 100)
  breed?: string;

  @ApiPropertyOptional({ description: 'Birth date (ISO string)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  introduction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emergency?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  emergencyReason?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  images?: string[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalHealthTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalHealthTagType, { each: true })
  healthTags?: AnimalHealthTagType[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalPersonalityTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalPersonalityTagType, { each: true })
  personalityTags?: AnimalPersonalityTagType[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalEnvironmentTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalEnvironmentTagType, { each: true })
  environmentTags?: AnimalEnvironmentTagType[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalSpecialNoteTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalSpecialNoteTagType, { each: true })
  specialNoteTags?: AnimalSpecialNoteTagType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFosterCondition?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentFosterStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentFosterEndDate?: string;
}

export class UpdateAnimalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shared?: boolean;

  @ApiPropertyOptional({ enum: AnimalStatusDto })
  @IsOptional()
  @IsEnum(AnimalStatusDto)
  status?: AnimalStatusDto;

  @ApiPropertyOptional({ enum: AnimalType })
  @IsOptional()
  @IsEnum(AnimalType)
  type?: AnimalType;

  @ApiPropertyOptional({ enum: AnimalSize })
  @IsOptional()
  @IsEnum(AnimalSize)
  size?: AnimalSize;

  @ApiPropertyOptional({ enum: AnimalGender })
  @IsOptional()
  @IsEnum(AnimalGender)
  gender?: AnimalGender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 100)
  breed?: string;

  @ApiPropertyOptional({ description: 'Birth date (ISO string)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  introduction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emergency?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  emergencyReason?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  images?: string[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalHealthTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalHealthTagType, { each: true })
  healthTags?: AnimalHealthTagType[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalPersonalityTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalPersonalityTagType, { each: true })
  personalityTags?: AnimalPersonalityTagType[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalEnvironmentTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalEnvironmentTagType, { each: true })
  environmentTags?: AnimalEnvironmentTagType[];

  @ApiPropertyOptional({ isArray: true, enum: AnimalSpecialNoteTagType })
  @IsOptional()
  @IsArray()
  @IsEnum(AnimalSpecialNoteTagType, { each: true })
  specialNoteTags?: AnimalSpecialNoteTagType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFosterCondition?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentFosterStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentFosterEndDate?: string;
}

export class CreateRecordDto {
  @ApiProperty({ description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  healthNote?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 6 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  images?: string[];
}

export class UpdateRecordDto {
  @ApiPropertyOptional({ description: 'ISO date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  healthNote?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 6 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  images?: string[];
}

// ======== Response DTOs (for Swagger) ========
export class OrganizationMetaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AnimalMetaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: AnimalStatusDto })
  status!: AnimalStatusDto;

  @ApiProperty()
  shared!: boolean;

  @ApiPropertyOptional({ type: () => OrganizationMetaDto, nullable: true })
  organization?: OrganizationMetaDto | null;
}

export class AnimalListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: AnimalStatusDto })
  status!: AnimalStatusDto;

  @ApiProperty()
  shared!: boolean;

  @ApiPropertyOptional({ nullable: true })
  orgId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  ownerUserId?: string | null;

  @ApiProperty()
  fosterDays!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ListAnimalsResponseDto {
  @ApiProperty({ type: () => [AnimalListItemDto] })
  items!: AnimalListItemDto[];
}

export class FosterRecordImageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional({ nullable: true })
  sortOrder?: number | null;
}

export class FosterRecordDtoOut {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  animalId!: string;

  @ApiProperty({ type: Date, description: 'Record date' })
  date!: Date;

  @ApiPropertyOptional({ nullable: true })
  content?: string | null;

  @ApiPropertyOptional({ nullable: true })
  healthNote?: string | null;

  @ApiProperty({ type: () => [FosterRecordImageDto] })
  images!: FosterRecordImageDto[];
}

export class ListRecordsResponseDto {
  @ApiProperty()
  animalId!: string;

  @ApiProperty({ type: () => AnimalMetaDto })
  animal!: AnimalMetaDto;

  @ApiProperty({ description: 'ISO date from' })
  from!: string;

  @ApiProperty({ description: 'ISO date to' })
  to!: string;

  @ApiProperty({ type: () => [FosterRecordDtoOut] })
  items!: FosterRecordDtoOut[];
}

export class GetRecordResponseDto extends FosterRecordDtoOut {
  @ApiProperty({ type: () => AnimalMetaDto })
  animal!: AnimalMetaDto;
}

export class DeleteAnimalResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: [true] })
  deleted!: true;
}

export class DeleteRecordResponseDto {
  @ApiProperty()
  animalId!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: [true] })
  deleted!: true;
}
