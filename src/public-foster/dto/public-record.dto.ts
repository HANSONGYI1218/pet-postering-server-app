import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnimalGender, AnimalType } from '@prisma/client';

import type { FosterState } from '../../domain/public-foster/application/record.types';

class PublicRecordAnimalDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: AnimalType, nullable: true })
  type!: AnimalType | null;

  @ApiPropertyOptional({ nullable: true })
  breed!: string | null;

  @ApiPropertyOptional({ nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({ enum: AnimalGender, nullable: true })
  gender!: AnimalGender | null;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiProperty()
  fosterDuration!: number;

  @ApiProperty({ enum: ['IN_PROGRESS', 'FOSTERED', 'ADOPTED'] })
  state!: FosterState;

  @ApiProperty()
  matchId!: string;
}

export class PublicRecordListResponseDto {
  @ApiProperty({ type: [PublicRecordAnimalDto] })
  items!: PublicRecordAnimalDto[];
}

class PublicRecordOrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  phoneNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  zipcode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressDetail!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;
}

class PublicRecordAnimalInfoDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: AnimalType, nullable: true })
  type!: AnimalType | null;

  @ApiPropertyOptional({ nullable: true })
  breed!: string | null;

  @ApiPropertyOptional({ nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({ enum: AnimalGender, nullable: true })
  gender!: AnimalGender | null;

  @ApiPropertyOptional({ nullable: true })
  remark!: string | null;

  @ApiProperty({ type: [String] })
  images!: string[];
}

class PublicRecordInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['IN_PROGRESS', 'FOSTERED', 'ADOPTED'] })
  state!: FosterState;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({
    type: () => PublicRecordOrganizationDto,
    nullable: true,
  })
  organization!: PublicRecordOrganizationDto | null;

  @ApiProperty({ type: () => PublicRecordAnimalInfoDto })
  animal!: PublicRecordAnimalInfoDto;
}

class PublicRecordEntryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  content!: string | null;

  @ApiPropertyOptional({ nullable: true })
  healthNote!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [String] })
  images!: string[];
}

export class PublicRecordDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: () => PublicRecordInfoDto })
  info!: PublicRecordInfoDto;

  @ApiProperty({ type: [PublicRecordEntryDto] })
  records!: PublicRecordEntryDto[];
}
