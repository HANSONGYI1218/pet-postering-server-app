import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  const JwtAuthGuard = AuthGuard('jwt');
  let app: INestApplication;
  let service: jest.Mocked<ReportsService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ReportsService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { userId: 'reporter-1', role: 'USER' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('POST /reports merges reporter id from guard', async () => {
    const created = { id: 'report-1', targetId: 'post-1' };
    service.create.mockResolvedValueOnce(created as any);

    await request(app.getHttpServer())
      .post('/reports')
      .send({ targetType: 'POST', targetId: 'post-1', reason: 'spam' })
      .expect(201)
      .expect(created);

    expect(service.create).toHaveBeenCalledWith({
      targetType: 'POST',
      targetId: 'post-1',
      reason: 'spam',
      reporterId: 'reporter-1',
    });
  });
});
