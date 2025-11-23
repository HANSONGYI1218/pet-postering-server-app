import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

describe('OrganizationController', () => {
  const JwtAuthGuard = AuthGuard('jwt');
  let app: INestApplication;
  let service: jest.Mocked<OrganizationService>;

  beforeEach(async () => {
    service = {
      listAnimals: jest.fn(),
      getAnimal: jest.fn(),
      acceptApplication: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [{ provide: OrganizationService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const rawUser = req.headers['x-test-user'];
          const rawRole = req.headers['x-test-role'];
          req.user = {
            userId: typeof rawUser === 'string' ? rawUser : 'jwt-user',
            role: typeof rawRole === 'string' ? rawRole : 'USER',
          };
          return true;
        },
      })
      .compile();

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

  it('POST /organization/applications/:id/accept forwards authenticated user', async () => {
    service.acceptApplication.mockResolvedValueOnce(undefined as any);

    await request(app.getHttpServer())
      .post('/organization/applications/app-1/accept')
      .set('x-test-user', 'admin-1')
      .set('x-test-role', 'ORG_ADMIN')
      .expect(201);

    expect(service.acceptApplication).toHaveBeenCalledWith(
      { userId: 'admin-1', role: 'ORG_ADMIN' },
      'app-1',
    );
  });
});
