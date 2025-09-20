import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthTokenPair } from '../domain/auth/application/types';
import { AuthService } from './auth.service';
import {
  AuthTokenPairDto,
  DevTokenDto,
  KakaoAuthDto,
  LogoutResponseDto,
  RefreshDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao')
  @ApiOperation({ summary: 'Exchange Kakao auth code for JWTs' })
  @ApiCreatedResponse({ type: AuthTokenPairDto })
  async kakaoLogin(@Body() body: KakaoAuthDto): Promise<AuthTokenPair> {
    return this.authService.kakaoLogin(body.code);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiOkResponse({ type: AuthTokenPairDto })
  async refresh(@Body() body: RefreshDto): Promise<AuthTokenPair> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout current user (no-op server-side)' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(): { ok: true } {
    return { ok: true };
  }

  @Post('dev-token')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: '[Dev] Issue tokens without Kakao (non-production)',
  })
  async devToken(
    @Body() body: DevTokenDto,
  ): Promise<AuthTokenPair | { error: 'disabled' }> {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'disabled' };
    }
    const kakaoId = body.kakaoId ?? `dev:${body.userId ?? 'user'}`;
    return this.authService.devIssueByKakaoId(kakaoId, body.displayName);
  }
}
