import { ApiProperty } from '@nestjs/swagger';
import { ReportTargetType } from '@prisma/client';
import { IsEnum, IsString, Length } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @ApiProperty()
  @IsString()
  targetId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  reason!: string;
}

export class ReportDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ReportTargetType })
  targetType!: ReportTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  reporterId!: string;

  @ApiProperty()
  createdAt!: Date;
}
