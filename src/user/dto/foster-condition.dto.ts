import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnimalAge,
  AnimalEnvironmentTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class FosterExperienceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ enum: AnimalType })
  @IsOptional()
  @IsEnum(AnimalType)
  animalType?: AnimalType | null;

  @ApiPropertyOptional({ enum: AnimalSize })
  @IsOptional()
  @IsEnum(AnimalSize)
  animalSize?: AnimalSize | null;

  @ApiPropertyOptional({ enum: AnimalAge })
  @IsOptional()
  @IsEnum(AnimalAge)
  animalAge?: AnimalAge | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpsertFosterConditionDto {
  @ApiProperty({ enum: AnimalType, isArray: true })
  @IsArray()
  @IsEnum(AnimalType, { each: true })
  preferredTypes!: AnimalType[];

  @ApiProperty({ enum: AnimalSize, isArray: true })
  @IsArray()
  @IsEnum(AnimalSize, { each: true })
  preferredSizes!: AnimalSize[];

  @ApiProperty({ enum: AnimalAge, isArray: true })
  @IsArray()
  @IsEnum(AnimalAge, { each: true })
  preferredAges!: AnimalAge[];

  @ApiProperty({ enum: AnimalEnvironmentTagType, isArray: true })
  @IsArray()
  @IsEnum(AnimalEnvironmentTagType, { each: true })
  fosterEnvironments!: AnimalEnvironmentTagType[];

  @ApiProperty({ enum: AnimalSpecialNoteTagType, isArray: true })
  @IsArray()
  @IsEnum(AnimalSpecialNoteTagType, { each: true })
  specialNoteTags!: AnimalSpecialNoteTagType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fosterPeriod?: string;

  @ApiProperty({ type: [FosterExperienceDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FosterExperienceDto)
  experiences?: FosterExperienceDto[];
}

export class FosterExperienceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ enum: AnimalType })
  animalType?: AnimalType | null;

  @ApiPropertyOptional({ enum: AnimalSize })
  animalSize?: AnimalSize | null;

  @ApiPropertyOptional({ enum: AnimalAge })
  animalAge?: AnimalAge | null;

  @ApiPropertyOptional({ type: String })
  startDate?: Date | null;

  @ApiPropertyOptional({ type: String })
  endDate?: Date | null;

  @ApiPropertyOptional()
  organizationName?: string | null;

  @ApiPropertyOptional()
  note?: string | null;
}

export class FosterConditionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AnimalType, isArray: true })
  preferredTypes!: AnimalType[];

  @ApiProperty({ enum: AnimalSize, isArray: true })
  preferredSizes!: AnimalSize[];

  @ApiProperty({ enum: AnimalAge, isArray: true })
  preferredAges!: AnimalAge[];

  @ApiProperty({ enum: AnimalEnvironmentTagType, isArray: true })
  fosterEnvironments!: AnimalEnvironmentTagType[];

  @ApiProperty({ enum: AnimalSpecialNoteTagType, isArray: true })
  specialNoteTags!: AnimalSpecialNoteTagType[];

  @ApiPropertyOptional()
  fosterPeriod?: string | null;

  @ApiProperty({ type: () => [FosterExperienceResponseDto] })
  experiences!: FosterExperienceResponseDto[];
}
