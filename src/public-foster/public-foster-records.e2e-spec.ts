import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type {
  PublicRecordDetail,
  PublicRecordListResult,
} from '../domain/public-foster/application/record.types';
import { PrismaService } from '../prisma/prisma.service';
import { PublicFosterModule } from './public-foster.module';

interface PrismaMock {
  animal: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  fosterRecord: {
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
}

const buildPrismaMock = (): PrismaMock => ({
  animal: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  fosterRecord: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
});

const baseAnimal = {
  id: 'animal-1',
  name: 'Buddy',
  status: 'IN_PROGRESS',
  shared: true,
  createdAt: new Date('2024-08-01T00:00:00.000Z'),
  breed: 'Jindo',
  birthDate: new Date('2024-01-01T00:00:00.000Z'),
  gender: 'MALE',
  type: 'DOG',
  images: [],
  introduction: 'Nice dog',
  remark: 'Loves walks',
  currentFosterStartDate: new Date('2024-08-01T00:00:00.000Z'),
  currentFosterEndDate: new Date('2024-08-10T00:00:00.000Z'),
  organization: {
    id: 'org-1',
    name: 'Org',
    phoneNumber: '010-0000-0000',
    zipcode: '01234',
    address: 'Seoul',
    addressDetail: 'Unit 101',
    email: 'hello@example.com',
  },
  healthTags: [],
  personalityTags: [],
  environmentTags: [],
  specialNoteTags: [],
} as const;

const createTestingApp = async (prismaMock: PrismaMock): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [PublicFosterModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  const nestApp = moduleRef.createNestApplication();
  await nestApp.init();
  return nestApp;
};

const getRequestTarget = (application: INestApplication): Parameters<typeof request>[0] =>
  application.getHttpServer() as Parameters<typeof request>[0];

describe('PublicFosterRecordsController (e2e)', () => {
  let app: INestApplication;
  const prisma = buildPrismaMock();

  beforeAll(async (): Promise<void> => {
    app = await createTestingApp(prisma);
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  it('returns foster records animals with normalized state', async () => {
    prisma.animal.findMany.mockResolvedValueOnce([baseAnimal]);
    prisma.fosterRecord.groupBy.mockResolvedValueOnce([]);

    const response = await request(getRequestTarget(app))
      .get('/public/foster/records/animals')
      .expect(200);

    const body = response.body as PublicRecordListResult;

    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: 'animal-1',
      state: 'IN_PROGRESS',
      fosterDuration: expect.any(Number),
      matchId: 'animal-1',
    });
  });

  it('returns record detail with foster timeline fields', async () => {
    prisma.animal.findUnique.mockResolvedValueOnce(baseAnimal);
    prisma.fosterRecord.findMany.mockResolvedValueOnce([
      {
        id: 'record-1',
        animalId: 'animal-1',
        date: new Date('2024-08-02T00:00:00.000Z'),
        content: 'hello',
        healthNote: 'fine',
        createdAt: new Date('2024-08-02T00:00:00.000Z'),
        updatedAt: new Date('2024-08-02T01:00:00.000Z'),
        images: [],
      },
    ]);

    const response = await request(getRequestTarget(app))
      .get('/public/foster/records/animals/animal-1')
      .expect(200);

    const body = response.body as PublicRecordDetail;

    expect(body.info.animal.currentFosterStartDate).toBe('2024-08-01T00:00:00.000Z');
    expect(body.info.animal.currentFosterEndDate).toBe('2024-08-10T00:00:00.000Z');
    expect(body.info.animal.introduction).toBe('Nice dog');
  });
});
