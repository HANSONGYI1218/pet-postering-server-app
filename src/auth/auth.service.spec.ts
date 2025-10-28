import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import axios, { type AxiosInstance } from 'axios';

import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { DEFAULT_JWT_ACCESS_SECRET, DEFAULT_JWT_REFRESH_SECRET } from './constants';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
  const setup = () => {
    const values: Record<string, string> = {
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_ACCESS_EXPIRES_IN: '30m',
      JWT_REFRESH_EXPIRES_IN: '10d',
      KAKAO_CLIENT_ID: 'kakao-client-id',
      KAKAO_CLIENT_SECRET: 'kakao-client-secret',
      KAKAO_REDIRECT_URI: 'https://app.example.com/callback',
    };
    const get = jest.fn((key: string) => values[key]);
    const config = { get } as unknown as ConfigService;

    const signAsync = jest.fn();
    const verifyAsync = jest.fn();
    const jwt = { signAsync, verifyAsync } as unknown as JwtService;

    const upsert = jest.fn();
    const findUnique = jest.fn();
    const prisma = {
      user: { upsert, findUnique },
    } as unknown as PrismaService;
    const logger = {
      setContext: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const post = jest.fn();
    const getAxios = jest.fn();
    mockedAxios.create.mockReturnValue({
      post,
      get: getAxios,
    } as unknown as AxiosInstance);

    const service = new AuthService(logger as never, jwt, config, prisma);
    return {
      service,
      signAsync,
      verifyAsync,
      upsert,
      findUnique,
      get,
      values,
      logger,
      httpPost: post,
      httpGet: getAxios,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.isAxiosError.mockReturnValue(false);
  });

  describe('kakaoLogin', () => {
    it('issues tokens after fetching user info with a Kakao code', async () => {
      const { service, signAsync, upsert, httpPost, httpGet } = setup();
      const axiosConfig = mockedAxios.create.mock.calls[0][0];
      expect(axiosConfig.timeout).toBe(5000);
      expect(axiosConfig.validateStatus(200)).toBe(true);
      expect(axiosConfig.validateStatus(400)).toBe(false);
      httpPost.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });
      httpGet.mockResolvedValueOnce({
        data: {
          id: 987,
          kakao_account: {
            profile: {
              nickname: 'neo',
              profile_image_url: 'https://cdn.kakao/neo.png',
            },
          },
        },
      });
      upsert.mockResolvedValueOnce({
        id: 'user-neo',
        role: 'USER',
        displayName: 'neo',
        avatarUrl: 'https://cdn.kakao/neo.png',
      });
      signAsync
        .mockResolvedValueOnce('issued-access')
        .mockResolvedValueOnce('issued-refresh');

      await expect(service.kakaoLogin('auth-code-123')).resolves.toEqual({
        token: 'issued-access',
        refreshToken: 'issued-refresh',
        displayName: 'neo',
        avatarUrl: 'https://cdn.kakao/neo.png',
      });

      expect(httpPost).toHaveBeenCalledTimes(1);
      const [, params, config] = httpPost.mock.calls[0];
      expect(httpPost.mock.calls[0][0]).toBe('https://kauth.kakao.com/oauth/token');
      expect(config).toEqual({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      expect(
        new URLSearchParams(params as URLSearchParams).toString().split('&').sort(),
      ).toEqual(
        [
          'grant_type=authorization_code',
          'client_id=kakao-client-id',
          'client_secret=kakao-client-secret',
          'redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback',
          'code=auth-code-123',
        ].sort(),
      );

      expect(httpGet).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: 'Bearer kakao-access-token' },
      });
      expect(upsert).toHaveBeenCalledWith({
        where: { kakaoId: '987' },
        update: {
          displayName: 'neo',
          avatarUrl: 'https://cdn.kakao/neo.png',
        },
        create: {
          kakaoId: '987',
          displayName: 'neo',
          avatarUrl: 'https://cdn.kakao/neo.png',
        },
      });
      expect(signAsync).toHaveBeenNthCalledWith(
        1,
        {
          sub: 'user-neo',
          role: 'USER',
          displayName: 'neo',
          avatarUrl: 'https://cdn.kakao/neo.png',
        },
        { secret: 'access-secret', expiresIn: '30m' },
      );
      expect(signAsync).toHaveBeenNthCalledWith(
        2,
        {
          sub: 'user-neo',
          role: 'USER',
          displayName: 'neo',
          avatarUrl: 'https://cdn.kakao/neo.png',
        },
        { secret: 'refresh-secret', expiresIn: '10d' },
      );
    });

    it('throws UnauthorizedException when the code is empty', async () => {
      const { service, httpPost } = setup();

      await expect(service.kakaoLogin('')).rejects.toThrow(UnauthorizedException);
      expect(httpPost).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when required Kakao config is missing', async () => {
      const { service, get, httpPost } = setup();
      get.mockImplementation((key: string) =>
        key === 'KAKAO_CLIENT_ID' ? undefined : 'value',
      );

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(httpPost).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when access_token is missing in the response', async () => {
      const { service, httpPost, httpGet } = setup();
      httpPost.mockResolvedValueOnce({ data: {} });

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the token request fails', async () => {
      const { service, httpPost, httpGet } = setup();
      httpPost.mockRejectedValueOnce(new Error('network down'));

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when fetching user information fails', async () => {
      const { service, httpPost, httpGet } = setup();
      httpPost.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });
      httpGet.mockRejectedValueOnce(new Error('user api error'));

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when Kakao response lacks an id', async () => {
      const { service, httpPost, httpGet } = setup();
      httpPost.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });
      httpGet.mockResolvedValueOnce({ data: { kakao_account: {} } });

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('issues new tokens with a valid refresh token', async () => {
      const { service, verifyAsync, signAsync, findUnique } = setup();
      verifyAsync.mockResolvedValueOnce({ sub: 'user-id', role: 'USER' });
      findUnique.mockResolvedValueOnce({
        id: 'user-id',
        role: 'USER',
        displayName: 'Tester',
        avatarUrl: 'https://cdn.kakao/tester.png',
      });
      signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

      await expect(service.refresh('refresh-token')).resolves.toEqual({
        token: 'new-access',
        refreshToken: 'new-refresh',
        displayName: 'Tester',
        avatarUrl: 'https://cdn.kakao/tester.png',
      });
      expect(verifyAsync).toHaveBeenCalledWith('refresh-token', {
        secret: 'refresh-secret',
      });
      expect(signAsync).toHaveBeenNthCalledWith(
        1,
        {
          sub: 'user-id',
          role: 'USER',
          displayName: 'Tester',
          avatarUrl: 'https://cdn.kakao/tester.png',
        },
        { secret: 'access-secret', expiresIn: '30m' },
      );
      expect(signAsync).toHaveBeenNthCalledWith(
        2,
        {
          sub: 'user-id',
          role: 'USER',
          displayName: 'Tester',
          avatarUrl: 'https://cdn.kakao/tester.png',
        },
        { secret: 'refresh-secret', expiresIn: '10d' },
      );
    });

    it('throws UnauthorizedException when verification fails', async () => {
      const { service, verifyAsync, signAsync } = setup();
      verifyAsync.mockRejectedValueOnce(new Error('invalid token'));

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
      expect(signAsync).not.toHaveBeenCalled();
    });
  });

  describe('jwt fallback configuration', () => {
    it('falls back to shared default secrets when config values are absent', async () => {
      const { service, signAsync, upsert, values, logger } = setup();
      delete values.JWT_ACCESS_SECRET;
      delete values.JWT_REFRESH_SECRET;
      upsert.mockResolvedValueOnce({
        id: 'user-1',
        role: 'USER',
        displayName: null,
        avatarUrl: null,
      });
      signAsync.mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');

      await expect(service.devIssueByKakaoId('kakao-1')).resolves.toEqual({
        token: 'token-1',
        refreshToken: 'token-2',
        displayName: null,
        avatarUrl: null,
      });

      expect(signAsync).toHaveBeenNthCalledWith(
        1,
        {
          sub: 'user-1',
          role: 'USER',
        },
        expect.objectContaining({ secret: DEFAULT_JWT_ACCESS_SECRET }),
      );
      expect(signAsync).toHaveBeenNthCalledWith(
        2,
        {
          sub: 'user-1',
          role: 'USER',
        },
        expect.objectContaining({ secret: DEFAULT_JWT_REFRESH_SECRET }),
      );
      expect(logger.warn).toHaveBeenCalledWith({
        msg: 'jwt-secret-fallback-used',
        configKey: 'JWT_ACCESS_SECRET',
      });
      expect(logger.warn).toHaveBeenCalledWith({
        msg: 'jwt-secret-fallback-used',
        configKey: 'JWT_REFRESH_SECRET',
      });
    });
  });

  describe('devIssueByKakaoId', () => {
    it('upserts the user and returns a token pair', async () => {
      const { service, upsert, signAsync } = setup();
      upsert.mockResolvedValueOnce({
        id: 'user-123',
        role: 'ORG_ADMIN',
        displayName: 'pet lover',
      });
      signAsync
        .mockResolvedValueOnce('access-from-dev')
        .mockResolvedValueOnce('refresh-from-dev');

      await expect(service.devIssueByKakaoId('kakao-123', 'pet lover')).resolves.toEqual({
        token: 'access-from-dev',
        refreshToken: 'refresh-from-dev',
        displayName: 'pet lover',
        avatarUrl: null,
      });
      expect(upsert).toHaveBeenCalledWith({
        where: { kakaoId: 'kakao-123' },
        update: { displayName: 'pet lover' },
        create: { kakaoId: 'kakao-123', displayName: 'pet lover' },
      });
    });
  });
});
