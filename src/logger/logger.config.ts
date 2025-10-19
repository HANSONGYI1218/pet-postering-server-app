import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Params } from 'nestjs-pino';

type RequestWithId = IncomingMessage & { id?: string };
type ResponseWithHeaders = ServerResponse & {
  setHeader(name: string, value: string): this;
};

const APP_NAME = 'pet-server';

const resolveLevel = (env: NodeJS.ProcessEnv): string =>
  env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug');

const normalizeRequestId = (
  incoming: string | string[] | undefined,
): string | undefined => {
  if (!incoming) {
    return undefined;
  }
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const buildLoggerOptions = (env: NodeJS.ProcessEnv): Params => {
  const stage = env.STAGE ?? 'local';
  const level = resolveLevel(env);

  return {
    pinoHttp: {
      level,
      base: { app: APP_NAME, stage },
      enabled: env.NODE_ENV !== 'test',
      customProps(request: RequestWithId) {
        return {
          requestId: request.id,
        };
      },
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'req.body.refreshToken',
      ],
      genReqId(request: RequestWithId, response: ResponseWithHeaders) {
        if (request.id) {
          return request.id;
        }
        const normalized = normalizeRequestId(request.headers['x-request-id']);
        const requestId = normalized ?? randomUUID();
        response.setHeader('x-request-id', requestId);
        return requestId;
      },
    },
  };
};
