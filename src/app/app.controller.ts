import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

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
    if (!stage || stage !== this.configService.get<string>('STAGE')) {
      throw new NotFoundException();
    }

    return { status: 'ok' };
  }
}
