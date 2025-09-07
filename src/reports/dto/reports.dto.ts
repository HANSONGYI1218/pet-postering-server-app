import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';

export enum ReportTargetTypeDto {
  POST = 'POST',
  COMMENT = 'COMMENT',
}

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetTypeDto })
  @IsEnum(ReportTargetTypeDto)
  targetType!: ReportTargetTypeDto;

  @ApiProperty()
  @IsString()
  targetId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  reason!: string;
}

