import { Module } from '@nestjs/common';

import { FosterConditionService } from './foster-condition.service';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, FosterConditionService],
  exports: [UsersService, FosterConditionService],
})
export class UsersModule {}
