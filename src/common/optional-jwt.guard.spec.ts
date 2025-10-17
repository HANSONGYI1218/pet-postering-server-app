import { OptionalJwtAuthGuard } from './optional-jwt.guard';
import type { AuthUser } from './types';

describe('OptionalJwtAuthGuard', () => {
  it('returns the user when authentication succeeds', () => {
    const guard = new OptionalJwtAuthGuard();
    const user = { userId: 'user-1', role: 'USER' };

    const result = guard.handleRequest(null, user, null as any, null as any);
    expect(result).toBe(user);
  });

  it('returns undefined when authentication fails', () => {
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
