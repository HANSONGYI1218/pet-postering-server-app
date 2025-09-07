import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // 토큰이 없거나 유효하지 않아도 에러를 던지지 않고 계속 진행
  // 유효할 경우에만 request.user를 채워준다
  handleRequest(err: any, user: any /* info: any, context: any, status?: any */) {
    return user ?? undefined;
  }
}

