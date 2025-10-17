import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
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
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const header = req.headers['x-test-user'] as string | undefined;
      if (header)
        (req as Request & { user?: AuthUser }).user = {
          userId: header,
          role: 'USER',
        };
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('injects request.user as-is', async () => {
    await request(app.getHttpServer())
      .get('/')
      .set('x-test-user', 'user-1')
      .expect(200)
      .expect({ userId: 'user-1', role: 'USER' });
  });

  it('returns null when user is missing', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect({});
  });
});
