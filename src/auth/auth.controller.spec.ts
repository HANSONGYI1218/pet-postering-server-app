import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DEFAULT_JWT_ACCESS_SECRET, DEFAULT_JWT_REFRESH_SECRET } from './constants';

describe('AuthController', () => {
  let app: INestApplication;
  let service: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    service = {
      kakaoLogin: jest.fn(),
      refresh: jest.fn(),
      devIssueByKakaoId: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('POST /auth/kakao forwards code to service', async () => {
    service.kakaoLogin.mockResolvedValueOnce({
      token: 'access',
      refreshToken: 'refresh',
      displayName: 'neo',
      avatarUrl: 'https://cdn.kakao/neo.png',
    });

    await request(app.getHttpServer())
      .post('/auth/kakao')
      .send({ code: 'auth-code-1' })
      .expect(201)
      .expect({
        token: 'access',
        refreshToken: 'refresh',
        displayName: 'neo',
        avatarUrl: 'https://cdn.kakao/neo.png',
      });

    expect(service.kakaoLogin).toHaveBeenCalledWith('auth-code-1');
  });

  it('POST /auth/refresh returns refreshed tokens with 200', async () => {
    service.refresh.mockResolvedValueOnce({
      token: 'new-access',
      refreshToken: 'new-refresh',
      displayName: 'Tester',
      avatarUrl: null,
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'refresh-123' })
      .expect(200)
      .expect({
        token: 'new-access',
        refreshToken: 'new-refresh',
        displayName: 'Tester',
        avatarUrl: null,
      });

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
      token: DEFAULT_JWT_ACCESS_SECRET,
      refreshToken: DEFAULT_JWT_REFRESH_SECRET,
      displayName: 'Tester',
      avatarUrl: null,
    });

    await request(app.getHttpServer())
      .post('/auth/dev-token')
      .send({ userId: 'user-77', displayName: 'Tester' })
      .expect(200)
      .expect({
        token: DEFAULT_JWT_ACCESS_SECRET,
        refreshToken: DEFAULT_JWT_REFRESH_SECRET,
        displayName: 'Tester',
        avatarUrl: null,
      });

    expect(service.devIssueByKakaoId).toHaveBeenCalledWith('dev:user-77', 'Tester');
  });

  it('POST /auth/dev-token returns disabled when NODE_ENV is production', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'production';
      }
      return undefined;
    });

    await request(app.getHttpServer())
      .post('/auth/dev-token')
      .send({ userId: 'user-1' })
      .expect(200)
      .expect({ error: 'disabled' });

    expect(service.devIssueByKakaoId).not.toHaveBeenCalled();
  });
});
