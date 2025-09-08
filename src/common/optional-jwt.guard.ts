import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from './types';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // 토큰이 없거나 유효하지 않아도 에러를 던지지 않고 계속 진행
  // 유효할 경우에만 request.user를 채워준다
  handleRequest<TUser = AuthUser>(
    _err: unknown,
    user: TUser,
    _info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser | undefined {
    return (user as TUser) ?? undefined;
  }
}
