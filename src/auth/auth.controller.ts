import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import type { AuthTokenPair } from '../domain/auth/application/types';
import { AuthService } from './auth.service';
import {
  AuthTokenPairDto,
  DevTokenDisabledDto,
  DevTokenDto,
  KakaoAuthDto,
  LogoutResponseDto,
  RefreshDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('kakao')
  @ApiOperation({ summary: 'Exchange Kakao auth code for JWTs' })
  @ApiCreatedResponse({ type: AuthTokenPairDto })
  async kakaoLogin(@Body() body: KakaoAuthDto): Promise<AuthTokenPair> {
    return this.authService.kakaoLogin(body.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiOkResponse({ type: AuthTokenPairDto })
  async refresh(@Body() body: RefreshDto): Promise<AuthTokenPair> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user (no-op server-side)' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(): { ok: true } {
    return { ok: true };
  }

  @Post('dev-token')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: '[Dev] Issue tokens without Kakao (non-production)',
  })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AuthTokenPairDto) },
        { $ref: getSchemaPath(DevTokenDisabledDto) },
      ],
    },
  })
  async devToken(
    @Body() body: DevTokenDto,
  ): Promise<AuthTokenPair | DevTokenDisabledDto> {
    if (this.isProduction()) {
      return { error: 'disabled' };
    }
    const kakaoId = body.kakaoId ?? `dev:${body.userId ?? 'user'}`;
    return this.authService.devIssueByKakaoId(kakaoId, body.displayName);
  }

  private isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
