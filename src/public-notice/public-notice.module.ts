import { Module } from '@nestjs/common';

import { PublicNoticeController } from './public-notice.controller';
import { PublicNoticeService } from './public-notice.service';

@Module({
  controllers: [PublicNoticeController],
  providers: [PublicNoticeService],
})
export class PublicNoticeModule {}
