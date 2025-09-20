import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { ExtractJwt } from 'passport-jwt';

jest.mock('passport-jwt', () => {
  const original = jest.requireActual('passport-jwt');
  return {
    ...original,
    ExtractJwt: {
      ...original.ExtractJwt,
      fromBodyField: jest.fn(() => 'bodyExtractor'),
    },
  };
});

describe('JwtRefreshStrategy', () => {
  it('refreshToken 필드에서 토큰을 읽고 사용자 페이로드를 반환한다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt-refresh' })],
      providers: [
        JwtRefreshStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_REFRESH_SECRET' ? 'refresh-secret' : undefined,
            ),
          },
        },
      ],
    }).compile();

    const strategy = moduleRef.get(JwtRefreshStrategy);
    const payload = await strategy.validate({ sub: 'user-1', role: 'USER' });

    expect(payload).toEqual({ userId: 'user-1', role: 'USER' });
    expect(ExtractJwt.fromBodyField).toHaveBeenCalledWith('refreshToken');
  });
});
