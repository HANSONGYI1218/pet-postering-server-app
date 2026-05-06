import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnimalGender, AnimalStatus, AnimalType } from '@prisma/client';

class PublicRecordAnimalDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: AnimalType, nullable: true })
  type!: AnimalType | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  breed!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({ enum: AnimalGender, nullable: true })
  gender!: AnimalGender | null;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiProperty()
  fosterDuration!: number;

  @ApiProperty({ enum: AnimalStatus, enumName: 'AnimalStatus' })
  state!: AnimalStatus;

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

  @ApiPropertyOptional({ type: String, nullable: true })
  phoneNumber!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  zipcode!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  addressDetail!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  email!: string | null;
}

class PublicRecordAnimalInfoDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: AnimalType, nullable: true })
  type!: AnimalType | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  breed!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({ enum: AnimalGender, nullable: true })
  gender!: AnimalGender | null;

  @ApiPropertyOptional({ enum: String, nullable: true })
  age!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  introduction!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  remark!: string | null;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  currentFosterStartDate!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  currentFosterEndDate!: string | null;
}

class PublicRecordInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AnimalStatus, enumName: 'AnimalStatus' })
  state!: AnimalStatus;

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

  @ApiPropertyOptional({ type: String, nullable: true })
  content!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
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
