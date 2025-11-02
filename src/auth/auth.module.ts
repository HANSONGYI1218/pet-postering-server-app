import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DEFAULT_JWT_ACCESS_SECRET } from './constants';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const resolveConfigString = (value: unknown, fallback: string): string => {
          if (typeof value === 'string' && value.trim().length > 0) {
            return value;
          }
          return fallback;
        };

        const isMsStringValue = (value: string): boolean =>
          /^-?\d+(\.\d+)?\s*(?:[a-zA-Z]+)?$/.test(value);

        let secret = DEFAULT_JWT_ACCESS_SECRET;
        try {
          const resolved = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
          secret = resolveConfigString(resolved, DEFAULT_JWT_ACCESS_SECRET);
        } catch (error: unknown) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              'JWT_ACCESS_SECRET is not configured. Falling back to default.',
              error,
            );
          }
        }

        const defaultExpiresIn = '15m';
        let expiresIn = defaultExpiresIn;
        try {
          const resolved = configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN');
          const candidate = resolveConfigString(resolved, defaultExpiresIn);
          expiresIn = isMsStringValue(candidate) ? candidate : defaultExpiresIn;
        } catch (error: unknown) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              'JWT_ACCESS_EXPIRES_IN is not configured. Using default.',
              error,
            );
          }
        }

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as NonNullable<
              JwtModuleOptions['signOptions']
            >['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
