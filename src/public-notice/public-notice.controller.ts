import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  PublicNoticeDetail,
  PublicNoticeListResult,
} from '../domain/public-notice/application/types';
import {
  PublicNoticeDetailDto,
  PublicNoticeListResponseDto,
} from './dto/public-notice.dto';
import { PublicNoticeService } from './public-notice.service';

@ApiTags('Public Notices')
@Controller('public/notices')
export class PublicNoticeController {
  constructor(private readonly publicNoticeService: PublicNoticeService) {}

  @Get()
  @ApiOperation({ summary: 'List public notices' })
  @ApiOkResponse({ type: PublicNoticeListResponseDto })
  list(): Promise<PublicNoticeListResult> {
    return this.publicNoticeService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a public notice detail' })
  @ApiOkResponse({ type: PublicNoticeDetailDto })
  get(@Param('id') id: string): Promise<PublicNoticeDetail> {
    return this.publicNoticeService.get(id);
  }
}
