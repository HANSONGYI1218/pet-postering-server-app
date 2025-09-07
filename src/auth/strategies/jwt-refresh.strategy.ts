import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly cs: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: cs.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh',
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, role: payload.role };
  }
}

