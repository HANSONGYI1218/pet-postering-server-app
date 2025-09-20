import { Module } from '@nestjs/common';

import { FosterController } from './foster.controller';
import { FosterService } from './foster.service';

@Module({
  controllers: [FosterController],
  providers: [FosterService],
})
export class FosterModule {}
