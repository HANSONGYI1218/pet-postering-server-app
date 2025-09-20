import { Controller, Get, Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './types';

@Controller()
class SampleController {
  @Get()
  handler(@CurrentUser() user?: AuthUser) {
    return user ?? null;
  }
}

@Module({ controllers: [SampleController] })
class SampleModule {}

describe('CurrentUser decorator', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SampleModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      const header = req.headers['x-test-user'] as string | undefined;
      if (header) req.user = { userId: header, role: 'USER' };
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('request.user를 그대로 주입한다', async () => {
    await request(app.getHttpServer())
      .get('/')
      .set('x-test-user', 'user-1')
      .expect(200)
      .expect({ userId: 'user-1', role: 'USER' });
  });

  it('user가 없으면 null을 반환한다', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect({});
  });
});
