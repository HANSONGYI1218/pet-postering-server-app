import { createHash } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PinoLogger } from 'nestjs-pino';

import type { AuthTokenPair } from '../domain/auth/application/types';
import {
  createKakaoTokenRequest,
  extractKakaoProfile,
  type KakaoConfig,
  type KakaoProfile,
  toUpsertUserCommand,
} from '../domain/auth/domain/kakao-flow';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_JWT_ACCESS_SECRET, DEFAULT_JWT_REFRESH_SECRET } from './constants';
import type { JwtPayload } from './jwt-payload';

interface JwtSettings {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  private readonly warnedConfigKeys = new Set<string>();

  async kakaoLogin(code: string): Promise<AuthTokenPair> {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new UnauthorizedException('missing-kakao-code');
    }

    const kakaoConfig = this.resolveKakaoConfig();
    const { url, params, headers } = createKakaoTokenRequest(kakaoConfig, trimmedCode);

    const tokenResponse = await axios
      .post<{ access_token?: string }>(url, params, { headers })
      .catch((error: unknown) => {
        this.logAxiosFailure('kakao-token-request-failed', error, { endpoint: url });
        throw new UnauthorizedException('kakao-token-request-failed', {
          cause: error,
        });
      });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new UnauthorizedException('kakao-token-missing');
    }

    const userResponse = await axios
      .get<unknown>(KAKAO_USER_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .catch((error: unknown) => {
        this.logAxiosFailure('kakao-user-fetch-failed', error, {
          endpoint: KAKAO_USER_URL,
        });
        throw new UnauthorizedException('kakao-user-fetch-failed', {
          cause: error,
        });
      });

    const profile = this.parseKakaoProfile(userResponse.data);
    const upsert = toUpsertUserCommand(profile);
    const user = await this.prisma.user.upsert(upsert);

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokenPair> {
    try {
      const { refreshSecret } = this.resolveJwtSettings();
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('user-not-found');
      }

      return await this.issueTokens(user);
    } catch (error: unknown) {
      this.logger.warn({
        msg: 'refresh-token-verification-failed',
        tokenDigest: toTokenDigest(refreshToken),
        err: error,
      });
      throw new UnauthorizedException('invalid-refresh-token', {
        cause: error,
      });
    }
  }

  async devIssueByKakaoId(kakaoId: string, displayName?: string): Promise<AuthTokenPair> {
    const upsert = toUpsertUserCommand({ id: kakaoId, nickname: displayName });
    const user = await this.prisma.user.upsert(upsert);
    return this.issueTokens(user);
  }

  private resolveKakaoConfig(): KakaoConfig {
    const clientId = this.config.get<string>('KAKAO_CLIENT_ID');
    const redirectUri = this.config.get<string>('KAKAO_REDIRECT_URI');
    const clientSecret = this.config.get<string>('KAKAO_CLIENT_SECRET') ?? undefined;

    if (!clientId || !redirectUri) {
      this.logger.error({
        msg: 'missing-kakao-config',
        hasClientId: Boolean(clientId),
        hasRedirectUri: Boolean(redirectUri),
      });
      throw new UnauthorizedException('missing-kakao-config');
    }

    return { clientId, redirectUri, clientSecret };
  }

  private resolveJwtSettings(): JwtSettings {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret) {
      this.warnMissingSecret('JWT_ACCESS_SECRET');
    }
    if (!refreshSecret) {
      this.warnMissingSecret('JWT_REFRESH_SECRET');
    }

    return {
      accessSecret: accessSecret ?? DEFAULT_JWT_ACCESS_SECRET,
      refreshSecret: refreshSecret ?? DEFAULT_JWT_REFRESH_SECRET,
      accessExpiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      refreshExpiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '14d',
    };
  }

  private async issueTokens(user: {
    id: string;
    role: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): Promise<AuthTokenPair> {
    const settings = this.resolveJwtSettings();
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      ...(user.displayName ? { displayName: user.displayName } : {}),
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    } as const;
    const [token, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: settings.accessSecret,
        expiresIn: settings.accessExpiresIn,
      }),
      this.jwt.signAsync(payload, {
        secret: settings.refreshSecret,
        expiresIn: settings.refreshExpiresIn,
      }),
    ]);
    return {
      token,
      refreshToken,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  private parseKakaoProfile(payload: unknown): KakaoProfile {
    try {
      return extractKakaoProfile(payload);
    } catch (error: unknown) {
      this.logger.error({ msg: 'kakao-profile-invalid', err: error });
      throw new UnauthorizedException('kakao-profile-invalid', {
        cause: error,
      });
    }
  }

  private warnMissingSecret(configKey: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): void {
    if (this.warnedConfigKeys.has(configKey)) {
      return;
    }
    this.logger.warn({
      msg: 'jwt-secret-fallback-used',
      configKey,
    });
    this.warnedConfigKeys.add(configKey);
  }

  private logAxiosFailure(
    msg: string,
    error: unknown,
    metadata: Record<string, unknown>,
  ): void {
    this.logger.error({
      msg,
      ...metadata,
      ...toAxiosMetadata(error),
      err: error,
    });
  }
}

const toAxiosMetadata = (error: unknown): Record<string, unknown> => {
  if (!axios.isAxiosError(error)) {
    return {};
  }
  return {
    status: error.response?.status,
    code: error.code,
  };
};

const toTokenDigest = (token: string): string =>
  createHash('sha256').update(token).digest('hex').slice(0, 16);
