import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ExtractJwt } from 'passport-jwt';

import { JwtAccessStrategy } from './jwt-access.strategy';

jest.mock('passport-jwt', () => {
  const original = jest.requireActual('passport-jwt');
  return {
    ...original,
    ExtractJwt: {
      fromAuthHeaderAsBearerToken: jest.fn(() => 'extractor'),
      fromBodyField: original.ExtractJwt.fromBodyField,
    },
  };
});

describe('JwtAccessStrategy', () => {
  it('reads the secret from ConfigService and returns the user payload', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [
        JwtAccessStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_ACCESS_SECRET' ? 'secret-123' : undefined,
            ),
          },
        },
      ],
    }).compile();

    const strategy = moduleRef.get(JwtAccessStrategy);
    const payload = strategy.validate({ sub: 'user-1', role: 'ORG_ADMIN' });

    expect(payload).toEqual({ userId: 'user-1', role: 'ORG_ADMIN' });
    expect(ExtractJwt.fromAuthHeaderAsBearerToken).toHaveBeenCalled();
  });
});
