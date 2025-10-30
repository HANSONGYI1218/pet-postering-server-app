import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

describe('OrganizationController', () => {
  let app: INestApplication;
  let service: jest.Mocked<OrganizationService>;

  beforeEach(async () => {
    service = {
      listAnimals: jest.fn(),
      getAnimal: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [{ provide: OrganizationService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /organization/animals returns list', async () => {
    service.listAnimals.mockResolvedValueOnce({ items: [] });

    await request(app.getHttpServer())
      .get('/organization/animals')
      .expect(200)
      .expect({ items: [] });

    expect(service.listAnimals).toHaveBeenCalledTimes(1);
  });

  it('GET /organization/animals/:id returns detail', async () => {
    const detail = { id: 'animal-1', name: 'Buddy' } as any;
    service.getAnimal.mockResolvedValueOnce(detail);

    await request(app.getHttpServer())
      .get('/organization/animals/animal-1')
      .expect(200)
      .expect(detail);

    expect(service.getAnimal).toHaveBeenCalledWith('animal-1');
  });
});
