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
  @ApiProperty({ description: '신청할 동물 ID' })
  @IsString()
  @IsNotEmpty()
  animalId!: string;

  @ApiProperty({ description: '신청자 이름' })
  @IsString()
  @Length(2, 50)
  applicantName!: string;

  @ApiProperty({ description: '연락처' })
  @IsPhoneNumber('KR')
  phoneNumber!: string;

  @ApiProperty({ description: '이메일' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '주소' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ description: '상세 주소', required: false })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiProperty({ description: '자기소개 및 신청 사유' })
  @IsString()
  @Length(10, 2000)
  introduction!: string;
}
