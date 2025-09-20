import { OptionalJwtAuthGuard } from './optional-jwt.guard';

describe('OptionalJwtAuthGuard', () => {
  it('유저가 존재하면 그대로 반환한다', () => {
    const guard = new OptionalJwtAuthGuard();
    const user = { userId: 'user-1', role: 'USER' };

    expect(guard.handleRequest(null, user, null as any, null as any)).toBe(
      user,
    );
  });

  it('유저가 없으면 undefined를 반환한다', () => {
    const guard = new OptionalJwtAuthGuard();

    expect(guard.handleRequest(new Error('token missing'), undefined, null as any, null as any)).toBeUndefined();
  });
});
