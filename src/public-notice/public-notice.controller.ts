import { Controller, Get, Param } from '@nestjs/common';

import {
  type PublicNoticeDetail,
  type PublicNoticeListResult,
  PublicNoticeService,
} from './public-notice.service';

@Controller('public/notices')
export class PublicNoticeController {
  constructor(private readonly publicNoticeService: PublicNoticeService) {}

  @Get()
  list(): Promise<PublicNoticeListResult> {
    return this.publicNoticeService.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<PublicNoticeDetail> {
    return this.publicNoticeService.get(id);
  }
}
