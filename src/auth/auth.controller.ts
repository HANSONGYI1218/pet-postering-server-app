import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevTokenDto, KakaoAuthDto, RefreshDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao')
  @ApiOperation({ summary: 'Exchange Kakao auth code for JWTs' })
  async kakaoLogin(@Body() body: KakaoAuthDto) {
    return this.authService.kakaoLogin(body.code);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout current user (no-op server-side)' })
  async logout() {
    return { ok: true };
  }

  // 개발 편의를 위한 토큰 발급(프로덕션 비활성)
  @Post('dev-token')
  @ApiOperation({
    summary: '[Dev] Issue tokens without Kakao (non-production)',
  })
  async devToken(@Body() body: DevTokenDto) {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'disabled' };
    }
    const kakaoId = body.kakaoId ?? `dev:${body.userId ?? 'user'}`;
    return this.authService.devIssueByKakaoId(kakaoId, body.displayName);
  }
}
