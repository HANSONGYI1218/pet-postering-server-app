import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let configService: jest.Mocked<ConfigService>;

  beforeAll(async () => {
    configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<ConfigService>;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: ConfigService, useValue: configService }],
    }).compile();

    controller = module.get(AppController);
  });

  beforeEach(() => {
    configService.get.mockReset();
    configService.get.mockReturnValue(undefined);
  });

  it('returns the default health string', () => {
    expect(controller.getHello()).toBe('OK');
  });

  it('returns the health check response', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });

  it('validates environment variables for stage health check', () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'STAGE') {
        return 'dev';
      }
      return undefined;
    });

    expect(controller.getStageHealth('dev')).toEqual({ status: 'ok' });
    expect(() => controller.getStageHealth('prod')).toThrow('Not Found');
  });
});
