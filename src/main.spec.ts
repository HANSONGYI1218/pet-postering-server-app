/* eslint-disable @typescript-eslint/no-require-imports */

describe('main bootstrap', () => {
  const originalPort = process.env.PORT;
  const originalStage = process.env.STAGE;

  afterEach(() => {
    process.env.PORT = originalPort;
    process.env.STAGE = originalStage;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('NestFactory.create와 app.listen을 호출한다', async () => {
    process.env.PORT = '4000';

    const enableCors = jest.fn();
    const useGlobalPipes = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const createDocument = jest.fn().mockReturnValue({});
    const setup = jest.fn();

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@nestjs/core', () => ({
        NestFactory: {
          create: jest.fn().mockResolvedValue({
            enableCors,
            useGlobalPipes,
            listen,
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

      const { bootstrap } = require('./main') as typeof import('./main');
      const { AppModule } = require('./app.module');
      const { NestFactory } = require('@nestjs/core');

      await bootstrap();

      expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
      expect(enableCors).toHaveBeenCalled();
      expect(useGlobalPipes).toHaveBeenCalledTimes(1);
      expect(listen).toHaveBeenCalledWith(4000, '0.0.0.0');
      expect(createDocument).toHaveBeenCalledTimes(1);
      expect(setup).toHaveBeenCalled();
    });
  });

  it('STAGE가 설정되면 stage prefixed Swagger 경로를 추가한다', async () => {
    process.env.PORT = '5000';
    process.env.STAGE = 'beta';

    const enableCors = jest.fn();
    const useGlobalPipes = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const createDocument = jest.fn().mockReturnValue({});
    const setup = jest.fn();

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@nestjs/core', () => ({
        NestFactory: {
          create: jest.fn().mockResolvedValue({
            enableCors,
            useGlobalPipes,
            listen,
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

      const { bootstrap } = require('./main') as typeof import('./main');

      await bootstrap();

      expect(createDocument).toHaveBeenCalledTimes(1);
      expect(setup).toHaveBeenCalledTimes(2);
      const paths = setup.mock.calls.map((call) => call[0]);
      expect(paths).toContain('api-docs');
      expect(paths).toContain('beta/api-docs');
    });
  });
});
