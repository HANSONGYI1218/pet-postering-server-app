import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get(AppController);
  });

  it('returns the default health string', () => {
    expect(controller.getHello()).toBe('OK');
  });

  it('returns the health check response', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });

  it('validates environment variables for stage health check', () => {
    const original = process.env.STAGE;
    process.env.STAGE = 'dev';

    expect(controller.getStageHealth('dev')).toEqual({ status: 'ok' });
    expect(() => controller.getStageHealth('prod')).toThrow('Not Found');

    if (original === undefined) {
      delete process.env.STAGE;
    } else {
      process.env.STAGE = original;
    }
  });
});
