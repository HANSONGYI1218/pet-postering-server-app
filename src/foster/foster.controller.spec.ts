import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { FosterController } from './foster.controller';
import { FosterService } from './foster.service';

describe('FosterController', () => {
  const JwtAuthGuard = AuthGuard('jwt');
  let app: INestApplication;
  let service: jest.Mocked<FosterService>;

  beforeEach(async () => {
    service = {
      listAnimals: jest.fn(),
      listSharedAnimals: jest.fn(),
      createAnimal: jest.fn(),
      updateAnimal: jest.fn(),
      deleteAnimal: jest.fn(),
      applyFoster: jest.fn(),
      listRecords: jest.fn(),
      getRecord: jest.fn(),
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      deleteRecord: jest.fn(),
    } as unknown as jest.Mocked<FosterService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [FosterController],
      providers: [{ provide: FosterService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const rawUser = req.headers['x-test-user'];
          const rawRole = req.headers['x-test-role'];
          const userId = typeof rawUser === 'string' ? rawUser : 'jwt-user';
          const role = typeof rawRole === 'string' ? rawRole : 'USER';
          req.user = { userId, role };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /foster/animals passes status filter directly', async () => {
    service.listAnimals.mockResolvedValueOnce({ items: [] } as any);

    await request(app.getHttpServer())
      .get('/foster/animals')
      .query({ status: 'WAITING' })
      .expect(200)
      .expect({ items: [] });

    expect(service.listAnimals).toHaveBeenCalledWith('WAITING');
  });

  it('POST /foster/applications forwards user and body', async () => {
    service.applyFoster.mockResolvedValueOnce(undefined);

    const payload = {
      animalId: 'animal-1',
      applicantName: 'Applicant',
      phoneNumber: '+821012345678',
      email: 'applicant@example.com',
      address: 'Seoul',
      introduction: 'Hello, I would like to foster.',
    };

    await request(app.getHttpServer())
      .post('/foster/applications')
      .set('x-test-user', 'user-1')
      .send(payload)
      .expect(201);

    expect(service.applyFoster).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'USER' },
      payload,
    );
  });

  it('POST /foster/animals includes authenticated user info', async () => {
    const created = { id: 'animal-1', name: 'Doggo' };
    service.createAnimal.mockResolvedValueOnce(created as any);

    await request(app.getHttpServer())
      .post('/foster/animals')
      .set('x-test-user', 'user-1')
      .set('x-test-role', 'ORG_ADMIN')
      .send({ name: 'Doggo', orgId: 'org-1' })
      .expect(201)
      .expect(created);

    expect(service.createAnimal).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'ORG_ADMIN' },
      { name: 'Doggo', orgId: 'org-1' },
    );
  });

  it('GET /foster/animals/:id/records forwards query window', async () => {
    const records = {
      animalId: 'animal-9',
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-02-01T00:00:00.000Z',
      items: [],
      animal: {
        id: 'animal-9',
        name: 'Cat',
        status: 'FOSTERING',
        shared: false,
        organization: null,
      },
    };
    service.listRecords.mockResolvedValueOnce(records as any);

    await request(app.getHttpServer())
      .get('/foster/animals/animal-9/records')
      .query({ from: records.from, to: records.to })
      .expect(200)
      .expect(records);

    expect(service.listRecords).toHaveBeenCalledWith(
      'animal-9',
      records.from,
      records.to,
    );
  });

  it('POST /foster/animals/:id/records enforces user context', async () => {
    const created = {
      id: 'record-1',
      animalId: 'animal-1',
      images: [],
    };
    service.createRecord.mockResolvedValueOnce(created as any);

    await request(app.getHttpServer())
      .post('/foster/animals/animal-1/records')
      .set('x-test-user', 'user-42')
      .send({ date: '2024-02-03', content: 'day one' })
      .expect(201)
      .expect(created);

    expect(service.createRecord).toHaveBeenCalledWith(
      'animal-1',
      { userId: 'user-42', role: 'USER' },
      { date: '2024-02-03', content: 'day one' },
    );
  });

  it('GET /foster/shared-animals delegates to service', async () => {
    service.listSharedAnimals.mockResolvedValueOnce({ items: [] } as any);

    await request(app.getHttpServer())
      .get('/foster/shared-animals')
      .expect(200)
      .expect({ items: [] });

    expect(service.listSharedAnimals).toHaveBeenCalledWith();
  });

  it('GET /foster/waiting-animals forces WAITING status', async () => {
    service.listAnimals.mockResolvedValueOnce({ items: [] } as any);

    await request(app.getHttpServer())
      .get('/foster/waiting-animals')
      .expect(200)
      .expect({ items: [] });

    expect(service.listAnimals).toHaveBeenCalledWith('WAITING');
  });

  it('PATCH /foster/animals/:id passes through body and user', async () => {
    service.updateAnimal.mockResolvedValueOnce({ id: 'animal-1' } as any);

    await request(app.getHttpServer())
      .patch('/foster/animals/animal-1')
      .set('x-test-user', 'user-3')
      .send({ name: 'Updated', shared: true })
      .expect(200)
      .expect({ id: 'animal-1' });

    expect(service.updateAnimal).toHaveBeenCalledWith(
      'animal-1',
      { userId: 'user-3', role: 'USER' },
      { name: 'Updated', shared: true },
    );
  });

  it('DELETE /foster/animals/:id forwards user to service', async () => {
    service.deleteAnimal.mockResolvedValueOnce({
      id: 'animal-1',
      deleted: true,
    } as any);

    await request(app.getHttpServer())
      .delete('/foster/animals/animal-1')
      .set('x-test-user', 'owner-1')
      .expect(200)
      .expect({ id: 'animal-1', deleted: true });

    expect(service.deleteAnimal).toHaveBeenCalledWith('animal-1', {
      userId: 'owner-1',
      role: 'USER',
    });
  });

  it('GET /foster/animals/:id/records/:recordId fetches detail', async () => {
    const record = { id: 'record-9', animalId: 'animal-1' };
    service.getRecord.mockResolvedValueOnce(record as any);

    await request(app.getHttpServer())
      .get('/foster/animals/animal-1/records/record-9')
      .expect(200)
      .expect(record);

    expect(service.getRecord).toHaveBeenCalledWith('animal-1', 'record-9');
  });

  it('PATCH /foster/animals/:id/records/:recordId updates record with user', async () => {
    service.updateRecord.mockResolvedValueOnce({ id: 'record-9' } as any);

    await request(app.getHttpServer())
      .patch('/foster/animals/animal-1/records/record-9')
      .set('x-test-user', 'user-5')
      .send({ content: 'updated' })
      .expect(200)
      .expect({ id: 'record-9' });

    expect(service.updateRecord).toHaveBeenCalledWith(
      'animal-1',
      'record-9',
      { userId: 'user-5', role: 'USER' },
      { content: 'updated' },
    );
  });

  it('DELETE /foster/animals/:id/records/:recordId forwards user context', async () => {
    service.deleteRecord.mockResolvedValueOnce({
      animalId: 'animal-1',
      id: 'record-9',
      deleted: true,
    } as any);

    await request(app.getHttpServer())
      .delete('/foster/animals/animal-1/records/record-9')
      .set('x-test-user', 'user-8')
      .expect(200)
      .expect({ animalId: 'animal-1', id: 'record-9', deleted: true });

    expect(service.deleteRecord).toHaveBeenCalledWith('animal-1', 'record-9', {
      userId: 'user-8',
      role: 'USER',
    });
  });
});
