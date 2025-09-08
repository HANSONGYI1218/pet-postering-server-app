import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiProperty({ description: 'ISO date' })
  date!: string;

  @ApiPropertyOptional({ nullable: true })
  content?: string | null;

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
