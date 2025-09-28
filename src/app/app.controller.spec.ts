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

  it('기본 상태 확인 문자열을 반환한다', () => {
    expect(controller.getHello()).toBe('OK');
  });

  it('헬스 체크 응답을 반환한다', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });

  it('스테이지 헬스 체크는 환경 변수를 검증한다', () => {
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
