import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { promises as fs } from 'fs';
import * as path from 'path';

import { AppModule } from '../src/app.module';

const OUTPUT_PATH = path.resolve(__dirname, '..', '..', 'openapi', 'pet-openapi.json');

const ensureAppClosed = async (app: INestApplication | null): Promise<void> => {
  if (!app) {
    return;
  }
  await app.close();
};

async function generateOpenApi(): Promise<void> {
  let app: INestApplication | null = null;

  try {
    app = await NestFactory.create(AppModule, {
      logger: false,
    });
    await app.init();

    const config = new DocumentBuilder()
      .setTitle('Pet Server API')
      .setDescription('Automatically generated OpenAPI schema')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(document, null, 2), 'utf-8');

    // eslint-disable-next-line no-console
    console.log(`OpenAPI schema written to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Failed to generate OpenAPI schema', error);
    process.exitCode = 1;
  } finally {
    await ensureAppClosed(app);
  }
}

void generateOpenApi();
