import { Module } from '@nestjs/common';

import { PublicFosterController } from './public-foster.controller';
import { PublicFosterService } from './public-foster.service';
import { PublicFosterRecordsController } from './public-foster-records.controller';
import { PublicFosterRecordsService } from './public-foster-records.service';

@Module({
  controllers: [PublicFosterController, PublicFosterRecordsController],
  providers: [PublicFosterService, PublicFosterRecordsService],
})
export class PublicFosterModule {}
