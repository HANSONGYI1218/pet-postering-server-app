import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';

describe('AppModule', () => {
  it('루트 모듈이 기본 의존성을 제공한다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(AppController)).toBeInstanceOf(AppController);
    expect(moduleRef.get(AppService)).toBeInstanceOf(AppService);
  });
});
