import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';

export class ApplyFosterDto {
  @ApiProperty({ description: 'Target animal ID' })
  @IsString()
  @IsNotEmpty()
  animalId!: string;

  @ApiProperty({ description: 'Applicant name' })
  @IsString()
  @Length(2, 50)
  applicantName!: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsPhoneNumber('KR')
  phoneNumber!: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Address' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ description: 'Address detail', required: false })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiProperty({ description: 'Introduction and motivation' })
  @IsString()
  @Length(10, 2000)
  introduction!: string;
}
