import { afterEach, describe, expect, it, jest } from '@jest/globals';

describe('main bootstrap', () => {
  const originalPort = process.env.PORT;
  const originalStage = process.env.STAGE;

  afterEach(() => {
    process.env.PORT = originalPort;
    process.env.STAGE = originalStage;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('invokes NestFactory.create and app.listen', async () => {
    process.env.PORT = '4000';

    const enableCors = jest.fn();
    const useGlobalPipes = jest.fn();
    const useLogger = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const createDocument = jest.fn().mockReturnValue({});
    const setup = jest.fn();
    const flushLogs = jest.fn();
    const loggerMock = { log: jest.fn(), error: jest.fn() };

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@nestjs/core', () => ({
        NestFactory: {
          create: jest.fn().mockResolvedValue({
            enableCors,
            useGlobalPipes,
            useLogger,
            listen,
            flushLogs,
            get: jest.fn().mockImplementation((token: unknown) => {
              const { Logger } =
                jest.requireActual<typeof import('nestjs-pino')>('nestjs-pino');
              return token === Logger ? loggerMock : undefined;
            }),
          }),
        },
      }));

      const actualSwagger =
        jest.requireActual<typeof import('@nestjs/swagger')>('@nestjs/swagger');
      jest.doMock('@nestjs/swagger', () => ({
        ...actualSwagger,
        SwaggerModule: {
          createDocument,
          setup,
        },
        DocumentBuilder: actualSwagger.DocumentBuilder,
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mainModule = require('./main') as typeof import('./main');
      const { bootstrap } = mainModule;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppModule } = require('./app.module') as typeof import('./app.module');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NestFactory } = require('@nestjs/core') as typeof import('@nestjs/core');

      await bootstrap();

      expect(NestFactory.create).toHaveBeenCalledWith(AppModule, { bufferLogs: true });
      expect(enableCors).toHaveBeenCalled();
      expect(useGlobalPipes).toHaveBeenCalledTimes(1);
      expect(useLogger).toHaveBeenCalledWith(loggerMock);
      expect(listen).toHaveBeenCalledWith(4000, '0.0.0.0');
      expect(createDocument).toHaveBeenCalledTimes(1);
      expect(setup).toHaveBeenCalled();
      expect(loggerMock.log).toHaveBeenCalledWith({
        msg: 'server-started',
        port: 4000,
        stage: 'local',
      });
      expect(flushLogs).toHaveBeenCalled();
    });
  });

  it('adds a stage-prefixed Swagger path when STAGE is set', async () => {
    process.env.PORT = '5000';
    process.env.STAGE = 'beta';

    const enableCors = jest.fn();
    const useGlobalPipes = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const createDocument = jest.fn().mockReturnValue({});
    const setup = jest.fn();
    const useLogger = jest.fn();
    const flushLogs = jest.fn();
    const loggerMock = { log: jest.fn(), error: jest.fn() };

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@nestjs/core', () => ({
        NestFactory: {
          create: jest.fn().mockResolvedValue({
            enableCors,
            useGlobalPipes,
            listen,
            useLogger,
            flushLogs,
            get: jest.fn().mockImplementation((token: unknown) => {
              const { Logger } =
                jest.requireActual<typeof import('nestjs-pino')>('nestjs-pino');
              return token === Logger ? loggerMock : undefined;
            }),
          }),
        },
      }));

      const actualSwagger =
        jest.requireActual<typeof import('@nestjs/swagger')>('@nestjs/swagger');
      jest.doMock('@nestjs/swagger', () => ({
        ...actualSwagger,
        SwaggerModule: {
          createDocument,
          setup,
        },
        DocumentBuilder: actualSwagger.DocumentBuilder,
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { bootstrap } = require('./main') as typeof import('./main');

      await bootstrap();

      expect(createDocument).toHaveBeenCalledTimes(1);
      expect(setup).toHaveBeenCalledTimes(2);
      const paths = setup.mock.calls.map((call) => call[0]);
      expect(paths).toContain('api-docs');
      expect(paths).toContain('beta/api-docs');
      expect(loggerMock.log).toHaveBeenCalledWith({
        msg: 'server-started',
        port: 5000,
        stage: 'beta',
      });
      expect(flushLogs).toHaveBeenCalled();
    });
  });
});
