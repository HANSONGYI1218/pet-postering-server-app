import { OptionalJwtAuthGuard } from './optional-jwt.guard';
import type { AuthUser } from './types';

describe('OptionalJwtAuthGuard', () => {
  it('유저가 존재하면 그대로 반환한다', () => {
    const guard = new OptionalJwtAuthGuard();
    const user = { userId: 'user-1', role: 'USER' };

    const result = guard.handleRequest(null, user, null as any, null as any);
    expect(result).toBe(user);
  });

  it('유저가 없으면 undefined를 반환한다', () => {
    const guard = new OptionalJwtAuthGuard();

    const result = guard.handleRequest<AuthUser | undefined>(
      new Error('token missing'),
      undefined,
      null as any,
      null as any,
    );
    expect(result).toBeUndefined();
  });
});
