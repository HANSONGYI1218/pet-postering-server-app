import type { AuthUser } from '../../../../common/types';
import { ensureAnimalWriteAccess } from '../permissions';

describe('ensureAnimalWriteAccess', () => {
  const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    userId: 'user-1',
    role: 'USER',
    ...overrides,
  });

  it('동물이 없으면 animal-not-found 오류를 반환한다', () => {
    expect(ensureAnimalWriteAccess(null, user())).toEqual({
      status: 'error',
      reason: 'animal-not-found',
    });
  });

  it('기관 동물은 ORG_ADMIN만 접근할 수 있다', () => {
    const animal = { orgId: 'org-1', ownerUserId: null };
    expect(ensureAnimalWriteAccess(animal, user())).toEqual({
      status: 'error',
      reason: 'animal-org-only',
    });
    expect(ensureAnimalWriteAccess(animal, user({ role: 'ORG_ADMIN' }))).toEqual({
      status: 'ok',
    });
  });

  it('개인 소유 동물은 소유자만 접근할 수 있다', () => {
    const animal = { orgId: null, ownerUserId: 'owner-1' };
    expect(ensureAnimalWriteAccess(animal, user({ userId: 'owner-1' }))).toEqual({
      status: 'ok',
    });
    expect(ensureAnimalWriteAccess(animal, user({ userId: 'intruder' }))).toEqual({
      status: 'error',
      reason: 'animal-not-owner',
    });
  });
});
