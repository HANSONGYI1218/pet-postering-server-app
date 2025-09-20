import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class KakaoAuthDto {
  @ApiProperty({ description: 'Authorization code from Kakao callback' })
  @IsString()
  code!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Previously issued refresh token' })
  @IsString()
  refreshToken!: string;
}

export class AuthTokenPairDto {
  @ApiProperty({ description: 'JWT access token' })
  token!: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ enum: [true] })
  ok!: true;
}

export class DevTokenDto {
  @ApiPropertyOptional({ description: 'Explicit kakaoId for dev seeding' })
  @IsOptional()
  @IsString()
  kakaoId?: string;

  @ApiPropertyOptional({ description: 'User id hint for dev tokens' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Display name for dev user' })
  @IsOptional()
  @IsString()
  displayName?: string;
}
