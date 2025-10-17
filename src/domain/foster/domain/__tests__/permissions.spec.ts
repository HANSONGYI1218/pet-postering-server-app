import type { AuthUser } from '../../../../common/types';
import { ensureAnimalWriteAccess } from '../permissions';

describe('ensureAnimalWriteAccess', () => {
  const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    userId: 'user-1',
    role: 'USER',
    ...overrides,
  });

  it('returns animal-not-found error when the animal is missing', () => {
    expect(ensureAnimalWriteAccess(null, user())).toEqual({
      status: 'error',
      reason: 'animal-not-found',
    });
  });

  it('allows only ORG_ADMIN to access organization animals', () => {
    const animal = { orgId: 'org-1', ownerUserId: null };
    expect(ensureAnimalWriteAccess(animal, user())).toEqual({
      status: 'error',
      reason: 'animal-org-only',
    });
    expect(ensureAnimalWriteAccess(animal, user({ role: 'ORG_ADMIN' }))).toEqual({
      status: 'ok',
    });
  });

  it('allows only the owner to access personal animals', () => {
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
