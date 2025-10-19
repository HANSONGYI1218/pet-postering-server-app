import type { AuthUser } from '../../../common/types';

interface MinimalAnimal {
  orgId: string | null;
  ownerUserId: string | null;
}

export type AnimalAccessResult =
  | { status: 'ok' }
  | {
      status: 'error';
      reason: 'animal-not-found' | 'animal-org-only' | 'animal-not-owner';
    };

export const ensureAnimalWriteAccess = (
  animal: MinimalAnimal | null,
  user: AuthUser,
): AnimalAccessResult => {
  if (!animal) {
    return { status: 'error', reason: 'animal-not-found' };
  }
  if (animal.orgId) {
    return user.role === 'ORG_ADMIN'
      ? { status: 'ok' }
      : { status: 'error', reason: 'animal-org-only' };
  }
  if (animal.ownerUserId && animal.ownerUserId !== user.userId) {
    return { status: 'error', reason: 'animal-not-owner' };
  }
  return { status: 'ok' };
};
