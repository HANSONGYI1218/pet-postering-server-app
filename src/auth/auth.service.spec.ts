import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import axios from 'axios';

import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

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

    const service = new AuthService(jwt, config, prisma);
    return { service, signAsync, verifyAsync, upsert, findUnique, get, values };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('kakaoLogin', () => {
    it('카카오 코드로 사용자 정보를 받아 토큰을 발급한다', async () => {
      const { service, signAsync, upsert } = setup();
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });
      mockedAxios.get.mockResolvedValueOnce({
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

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [, params, config] = mockedAxios.post.mock.calls[0];
      expect(mockedAxios.post.mock.calls[0][0]).toBe(
        'https://kauth.kakao.com/oauth/token',
      );
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

      expect(mockedAxios.get).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me', {
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

    it('code가 없으면 UnauthorizedException을 던진다', async () => {
      const { service } = setup();

      await expect(service.kakaoLogin('')).rejects.toThrow(UnauthorizedException);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('필수 카카오 설정이 없으면 UnauthorizedException을 던진다', async () => {
      const { service, get } = setup();
      get.mockImplementation((key: string) =>
        key === 'KAKAO_CLIENT_ID' ? undefined : 'value',
      );

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('토큰 응답에 access_token이 없으면 UnauthorizedException을 던진다', async () => {
      const { service } = setup();
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('토큰 요청이 실패하면 UnauthorizedException을 던진다', async () => {
      const { service } = setup();
      mockedAxios.post.mockRejectedValueOnce(new Error('network down'));

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('사용자 조회가 실패하면 UnauthorizedException을 던진다', async () => {
      const { service } = setup();
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });
      mockedAxios.get.mockRejectedValueOnce(new Error('user api error'));

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('카카오 사용자 응답에 id가 없으면 UnauthorizedException을 던진다', async () => {
      const { service } = setup();
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { kakao_account: {} } });

      await expect(service.kakaoLogin('auth-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('유효한 리프레시 토큰으로 새 토큰을 발급한다', async () => {
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

    it('검증 실패 시 UnauthorizedException을 던진다', async () => {
      const { service, verifyAsync, signAsync } = setup();
      verifyAsync.mockRejectedValueOnce(new Error('invalid token'));

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
      expect(signAsync).not.toHaveBeenCalled();
    });
  });

  describe('devIssueByKakaoId', () => {
    it('사용자를 upsert 후 토큰 쌍을 반환한다', async () => {
      const { service, upsert, signAsync } = setup();
      upsert.mockResolvedValueOnce({
        id: 'user-123',
        role: 'ADMIN',
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
