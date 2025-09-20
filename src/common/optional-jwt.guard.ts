import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import type { AuthUser } from './types';

interface RequestWithUser {
  user?: AuthUser;
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser>(
    _err: unknown,
    user: TUser | undefined,
    _info: unknown,
    context: ExecutionContext,
    _status?: unknown,
  ): TUser | undefined {
    if (user) return user;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const requestUser = request.user;
    return requestUser as TUser | undefined;
  }
}
