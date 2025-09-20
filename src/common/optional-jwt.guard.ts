import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import type { AuthUser } from './types';

interface RequestWithUser {
  user?: AuthUser;
}

const hasSwitchToHttp = (
  candidate: unknown,
): candidate is Pick<ExecutionContext, 'switchToHttp'> => {
  if (!candidate || typeof candidate !== 'object') return false;
  const { switchToHttp } = candidate as { switchToHttp?: unknown };
  return typeof switchToHttp === 'function';
};

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
    if (!hasSwitchToHttp(context)) return undefined;
    const httpContext = context.switchToHttp();
    if (typeof httpContext.getRequest !== 'function') return undefined;
    const request = httpContext.getRequest<RequestWithUser | undefined>();
    const requestUser = request?.user;
    return requestUser as TUser | undefined;
  }
}
