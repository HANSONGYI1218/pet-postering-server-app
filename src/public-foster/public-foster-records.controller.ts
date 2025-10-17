import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  PublicRecordDetail,
  PublicRecordListResult,
} from '../domain/public-foster/application/record.types';
import {
  PublicRecordDetailDto,
  PublicRecordListResponseDto,
} from './dto/public-record.dto';
import { PublicFosterRecordsService } from './public-foster-records.service';

@ApiTags('Public Foster Records')
@Controller('public/foster/records')
export class PublicFosterRecordsController {
  constructor(private readonly service: PublicFosterRecordsService) {}

  @Get('animals')
  @ApiOperation({ summary: 'List animals with foster records (public)' })
  @ApiOkResponse({ type: PublicRecordListResponseDto })
  listAnimals(): Promise<PublicRecordListResult> {
    return this.service.listAnimals();
  }

  @Get('animals/:id')
  @ApiOperation({ summary: 'Get foster record detail (public)' })
  @ApiOkResponse({ type: PublicRecordDetailDto })
  getAnimal(@Param('id') id: string): Promise<PublicRecordDetail> {
    return this.service.getAnimal(id);
  }
}
