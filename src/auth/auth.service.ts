import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private kakaoTokenUrl = 'https://kauth.kakao.com/oauth/token';
  private kakaoUserUrl = 'https://kapi.kakao.com/v2/user/me';

  constructor(
    private readonly jwt: JwtService,
    private readonly cs: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async kakaoLogin(code: string) {
    if (!code) throw new UnauthorizedException('Missing code');
    const clientId = this.cs.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = this.cs.get<string>('KAKAO_CLIENT_SECRET');
    const redirectUri = this.cs.get<string>('KAKAO_REDIRECT_URI');
    if (!clientId || !redirectUri)
      throw new UnauthorizedException('Kakao config missing');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    });
    if (clientSecret) params.append('client_secret', clientSecret);

    const tokenRes = await axios.post(this.kakaoTokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const accessToken = tokenRes.data.access_token as string;
    if (!accessToken) throw new UnauthorizedException('Kakao token error');

    const userRes = await axios.get(this.kakaoUserUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const kakaoId = String(userRes.data.id);
    const nickname = userRes.data?.kakao_account?.profile?.nickname as
      | string
      | undefined;

    const user = await this.prisma.user.upsert({
      where: { kakaoId },
      update: { displayName: nickname ?? undefined },
      create: { kakaoId, displayName: nickname ?? undefined },
    });

    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.cs.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh',
      });
      return this.issueTokens(payload.sub, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(userId: string, role: string) {
    const access = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.cs.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access',
        expiresIn: this.cs.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );
    const refresh = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.cs.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh',
        expiresIn: this.cs.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '14d',
      },
    );
    return { token: access, refreshToken: refresh };
  }

  async devIssueByKakaoId(kakaoId: string, displayName?: string) {
    const user = await this.prisma.user.upsert({
      where: { kakaoId },
      update: { displayName: displayName ?? undefined },
      create: { kakaoId, displayName: displayName ?? undefined },
    });
    return this.issueTokens(user.id, user.role);
  }
}
