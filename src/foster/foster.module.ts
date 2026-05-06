import { Module } from '@nestjs/common';

import { FosterController } from './foster.controller';
import { FosterMatcherController } from './foster.matcher.controller';
import { FosterMatcherService } from './foster.matcher.service';
import { FosterService } from './foster.service';

@Module({
  controllers: [FosterController, FosterMatcherController],
  providers: [FosterService, FosterMatcherService],
})
export class FosterModule {}
