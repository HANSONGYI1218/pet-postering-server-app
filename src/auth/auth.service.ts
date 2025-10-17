import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

import type { AuthTokenPair } from '../domain/auth/application/types';
import {
  createKakaoTokenRequest,
  extractKakaoProfile,
  type KakaoConfig,
  type KakaoProfile,
  toUpsertUserCommand,
} from '../domain/auth/domain/kakao-flow';
import { PrismaService } from '../prisma/prisma.service';

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
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async kakaoLogin(code: string): Promise<AuthTokenPair> {
    const trimmedCode = code.trim();
    if (!trimmedCode) throw new UnauthorizedException('missing-kakao-code');

    const kakaoConfig = this.resolveKakaoConfig();
    const { url, params, headers } = createKakaoTokenRequest(kakaoConfig, trimmedCode);

    const tokenResponse = await axios
      .post<{ access_token?: string }>(url, params, { headers })
      .catch(() => {
        throw new UnauthorizedException('kakao-token-request-failed');
      });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new UnauthorizedException('kakao-token-missing');

    const userResponse = await axios
      .get<unknown>(KAKAO_USER_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .catch(() => {
        throw new UnauthorizedException('kakao-user-fetch-failed');
      });

    const profile = this.parseKakaoProfile(userResponse.data);
    const upsert = toUpsertUserCommand(profile);
    const user = await this.prisma.user.upsert(upsert);

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokenPair> {
    try {
      const { refreshSecret } = this.resolveJwtSettings();
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        refreshToken,
        { secret: refreshSecret },
      );
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('user-not-found');
      }

      return await this.issueTokens(user);
    } catch (error) {
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
      throw new UnauthorizedException('missing-kakao-config');
    }

    return { clientId, redirectUri, clientSecret };
  }

  private resolveJwtSettings(): JwtSettings {
    return {
      accessSecret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access',
      refreshSecret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh',
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
    const payload = {
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
    } catch (error) {
      throw new UnauthorizedException('kakao-profile-invalid', {
        cause: error,
      });
    }
  }
}
