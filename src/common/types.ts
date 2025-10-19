import type { Role } from '@prisma/client';

export interface AuthUser {
  userId: string;
  role: Role;
}

export interface RequestWithAuthUser {
  user?: AuthUser;
}
