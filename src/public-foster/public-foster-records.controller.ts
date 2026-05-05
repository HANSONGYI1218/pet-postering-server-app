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
  constructor(private readonly publicFosterRecordsService: PublicFosterRecordsService) {}

  @Get('animals')
  @ApiOperation({ summary: 'List animals with foster records (public)' })
  @ApiOkResponse({ type: PublicRecordListResponseDto })
  listAnimals(): Promise<PublicRecordListResult> {
    return this.publicFosterRecordsService.listAnimals();
  }

  @Get('animals/user/:userId')
  @ApiOperation({ summary: 'Get animal detail' })
  @ApiOkResponse({ type: PublicRecordListResponseDto })
  getAnimalsByUserId(@Param('userId') userId: string): Promise<PublicRecordListResult> {
    return this.publicFosterRecordsService.getAnimalsByUserId(userId);
  }

  @Get('animals/:id')
  @ApiOperation({ summary: 'Get foster record detail (public)' })
  @ApiOkResponse({ type: PublicRecordDetailDto })
  getAnimal(@Param('id') id: string): Promise<PublicRecordDetail> {
    const ressult = this.publicFosterRecordsService.getAnimal(id);
    return ressult;
  }
}
