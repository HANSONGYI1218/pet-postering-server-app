import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get(['health', 'api/health'])
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get(':stage/api/health')
  getStageHealth(@Param('stage') stage: string): { status: 'ok' } {
    if (!stage || stage !== process.env.STAGE) {
      throw new NotFoundException();
    }

    return { status: 'ok' };
  }
}
