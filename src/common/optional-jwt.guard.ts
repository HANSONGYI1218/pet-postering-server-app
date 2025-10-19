import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import type { AuthUser, RequestWithAuthUser } from './types';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser>(
    _err: unknown,
    user: TUser | undefined,
    _info: unknown,
    context: ExecutionContext,
    _status?: unknown,
  ): TUser | undefined {
    if (user) {
      return user;
    }
    const request = context.switchToHttp().getRequest<RequestWithAuthUser | undefined>();
    return request?.user as TUser | undefined;
  }
}
