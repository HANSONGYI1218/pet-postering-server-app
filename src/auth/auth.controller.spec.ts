import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let app: INestApplication;
  let service: jest.Mocked<AuthService>;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    service = {
      kakaoLogin: jest.fn(),
      refresh: jest.fn(),
      devIssueByKakaoId: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  it('POST /auth/kakao forwards code to service', async () => {
    service.kakaoLogin.mockResolvedValueOnce({
      token: 'access',
      refreshToken: 'refresh',
    });

    await request(app.getHttpServer())
      .post('/auth/kakao')
      .send({ code: 'auth-code-1' })
      .expect(201)
      .expect({ token: 'access', refreshToken: 'refresh' });

    expect(service.kakaoLogin).toHaveBeenCalledWith('auth-code-1');
  });

  it('POST /auth/refresh returns refreshed tokens with 200', async () => {
    service.refresh.mockResolvedValueOnce({
      token: 'new-access',
      refreshToken: 'new-refresh',
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'refresh-123' })
      .expect(200)
      .expect({ token: 'new-access', refreshToken: 'new-refresh' });

    expect(service.refresh).toHaveBeenCalledWith('refresh-123');
  });

  it('POST /auth/logout returns ok payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(200)
      .expect({ ok: true });
  });

  it('POST /auth/dev-token computes kakao id when absent', async () => {
    service.devIssueByKakaoId.mockResolvedValueOnce({
      token: 'dev-access',
      refreshToken: 'dev-refresh',
    });

    await request(app.getHttpServer())
      .post('/auth/dev-token')
      .send({ userId: 'user-77', displayName: 'Tester' })
      .expect(201)
      .expect({ token: 'dev-access', refreshToken: 'dev-refresh' });

    expect(service.devIssueByKakaoId).toHaveBeenCalledWith(
      'dev:user-77',
      'Tester',
    );
  });
});
