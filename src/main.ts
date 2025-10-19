import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Pet Server API')
    .setDescription('REST API for community and foster features')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = 'api-docs';
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const stage = process.env.STAGE;
  if (stage) {
    SwaggerModule.setup(`${stage}/${swaggerPath}`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  try {
    await app.listen(port, '0.0.0.0');
    logger.log({ msg: 'server-started', port, stage: stage ?? 'local' });
  } catch (error: unknown) {
    logger.error({
      msg: 'server-start-failed',
      port,
      stage: stage ?? 'local',
      err: error,
    });
    await app.close();
    throw error;
  } finally {
    app.flushLogs();
  }
}

if (!process.env.JEST_WORKER_ID) {
  void bootstrap();
}
