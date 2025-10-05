import { Module } from '@nestjs/common';

import { PublicFosterController } from './public-foster.controller';
import { PublicFosterService } from './public-foster.service';

@Module({
  controllers: [PublicFosterController],
  providers: [PublicFosterService],
})
export class PublicFosterModule {}
