import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FosterService } from './foster.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';

type MockFn = jest.Mock<any, any>;

interface PrismaMock {
  animal: {
    findMany: MockFn;
    findUnique: MockFn;
    create: MockFn;
    update: MockFn;
    delete: MockFn;
  };
  fosterRecord: {
    findFirst: MockFn;
    findMany: MockFn;
    findUnique: MockFn;
    create: MockFn;
    update: MockFn;
    delete: MockFn;
  };
  fosterRecordImage: {
    deleteMany: MockFn;
    createMany: MockFn;
    findMany: MockFn;
  };
  $transaction: MockFn;
}

const build = () => {
  const prisma: PrismaMock = {
    animal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    fosterRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    fosterRecordImage: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const service = new FosterService(prisma as unknown as PrismaService);
  return { service, prisma };
};

describe('FosterService', () => {
  describe('updateRecord', () => {
    it('이미지 교체와 함께 기록을 갱신한다', async () => {
      const { service, prisma } = build();
      const user: AuthUser = { userId: 'admin', role: 'ORG_ADMIN' };
      const record = {
        id: 'record-1',
        animalId: 'animal-1',
      } as any;
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(record);
      const animal = {
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      } as any;
      prisma.animal.findUnique.mockResolvedValueOnce(animal);

      const updated = {
        id: 'record-1',
        animalId: 'animal-1',
        date: new Date('2024-02-01T00:00:00.000Z'),
        content: 'new content',
      } as any;
      const images = [
        { id: 'img-1', recordId: 'record-1', url: 'https://img/1', sortOrder: 0 },
      ];
      const tx = {
        fosterRecord: {
          update: jest.fn().mockResolvedValueOnce(updated),
        },
        fosterRecordImage: {
          deleteMany: jest.fn().mockResolvedValueOnce(undefined),
          createMany: jest.fn().mockResolvedValueOnce(undefined),
          findMany: jest.fn().mockResolvedValueOnce(images),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      const dto = {
        date: '2024-02-01',
        content: 'new content',
        images: Array.from({ length: 7 }, (_, i) => `https://img/${i + 1}`),
      };

      const result = await service.updateRecord(
        'animal-1',
        'record-1',
        user,
        dto,
      );

      expect(prisma.fosterRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'record-1' },
      });
      expect(prisma.animal.findUnique).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.fosterRecord.update).toHaveBeenCalledWith({
        where: { id: 'record-1' },
        data: {
          content: 'new content',
          date: new Date('2024-02-01'),
        },
      });
      expect(tx.fosterRecordImage.deleteMany).toHaveBeenCalledWith({
        where: { recordId: 'record-1' },
      });
      expect(tx.fosterRecordImage.createMany).toHaveBeenCalledWith({
        data: dto.images!.slice(0, 6).map((url, i) => ({
          recordId: 'record-1',
          url,
          sortOrder: i,
        })),
      });
      expect(tx.fosterRecordImage.findMany).toHaveBeenCalledWith({
        where: { recordId: 'record-1' },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result).toEqual({
        ...updated,
        images,
      });
    });

    it('작성 권한이 없으면 ForbiddenException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.updateRecord('animal-1', 'record-1', {
          userId: 'intruder',
          role: 'USER',
        }, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('listAnimals', () => {
    it('상태 조건을 적용하고 입양 경과일을 계산한다', async () => {
      const { service, prisma } = build();
      const createdAtA = new Date('2024-01-01T00:00:00.000Z');
      const createdAtB = new Date('2024-01-05T00:00:00.000Z');
      prisma.animal.findMany.mockResolvedValueOnce([
        { id: 'animal-a', status: 'ADOPTABLE', createdAt: createdAtA } as any,
        { id: 'animal-b', status: 'ADOPTABLE', createdAt: createdAtB } as any,
      ]);
      prisma.fosterRecord.findFirst
        .mockResolvedValueOnce({ date: new Date('2023-12-31T00:00:00.000Z') })
        .mockResolvedValueOnce(null);

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-10T00:00:00.000Z'));

      const result = await service.listAnimals('ADOPTABLE');

      jest.useRealTimers();

      expect(prisma.animal.findMany).toHaveBeenCalledWith({
        where: { status: 'ADOPTABLE' },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.fosterRecord.findFirst).toHaveBeenNthCalledWith(1, {
        where: { animalId: 'animal-a' },
        orderBy: { date: 'asc' },
        select: { date: true },
      });
      expect(prisma.fosterRecord.findFirst).toHaveBeenNthCalledWith(2, {
        where: { animalId: 'animal-b' },
        orderBy: { date: 'asc' },
        select: { date: true },
      });
      const daysById = Object.fromEntries(
        result.items.map((item: any) => [item.id, item.fosterDays]),
      );
      expect(daysById).toEqual({ 'animal-a': 10, 'animal-b': 5 });
    });

    it('상태 미지정 시 전체 동물을 반환한다', async () => {
      const { service, prisma } = build();
      prisma.animal.findMany.mockResolvedValueOnce([
        { id: 'animal-1', createdAt: new Date('2024-01-01T00:00:00.000Z') } as any,
      ]);
      prisma.fosterRecord.findFirst.mockResolvedValueOnce(null);

      jest.useFakeTimers().setSystemTime(new Date('2024-01-03T00:00:00.000Z'));
      await service.listAnimals();
      jest.useRealTimers();

      expect(prisma.animal.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('listSharedAnimals', () => {
    it('shared=true 조건으로 조회한다', async () => {
      const { service, prisma } = build();
      prisma.animal.findMany.mockResolvedValueOnce([
        { id: 'animal-1', shared: true, createdAt: new Date() } as any,
      ]);
      prisma.fosterRecord.findFirst.mockResolvedValueOnce(null);

      jest.useFakeTimers().setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
      await service.listSharedAnimals();
      jest.useRealTimers();

      expect(prisma.animal.findMany).toHaveBeenCalledWith({
        where: { shared: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createAnimal', () => {
    it('기관 동물은 ORG_ADMIN만 생성할 수 있다', async () => {
      const { service, prisma } = build();

      await expect(
        service.createAnimal(
          { userId: 'user-1', role: 'USER' },
          { name: 'Buddy', orgId: 'org-1' },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.create).not.toHaveBeenCalled();
    });

    it('ORG_ADMIN이면 orgId와 shared 값을 사용해 생성한다', async () => {
      const { service, prisma } = build();
      prisma.animal.create.mockResolvedValueOnce({ id: 'animal-1' } as any);

      await expect(
        service.createAnimal(
          { userId: 'admin', role: 'ORG_ADMIN' },
          { name: 'Buddy', orgId: 'org-1', shared: true },
        ),
      ).resolves.toEqual({ id: 'animal-1' });
      expect(prisma.animal.create).toHaveBeenCalledWith({
        data: { name: 'Buddy', orgId: 'org-1', shared: true },
      });
    });

    it('개인 동물은 요청 사용자 ID를 ownerUserId로 설정한다', async () => {
      const { service, prisma } = build();
      prisma.animal.create.mockResolvedValueOnce({ id: 'animal-2' } as any);

      await expect(
        service.createAnimal(
          { userId: 'owner-1', role: 'USER' },
          { name: 'Cat', shared: false },
        ),
      ).resolves.toEqual({ id: 'animal-2' });
      expect(prisma.animal.create).toHaveBeenCalledWith({
        data: { name: 'Cat', ownerUserId: 'owner-1', shared: false },
      });
    });
  });

  describe('listRecords', () => {
    it('기본 6개월 윈도우를 사용해 기록을 조회한다', async () => {
      const { service, prisma } = build();
      const now = new Date('2024-06-15T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        name: 'Buddy',
        status: 'FOSTERING',
        shared: true,
        organization: { id: 'org-1', name: 'Rescue' },
      } as any);
      const records = [
        {
          id: 'rec-1',
          animalId: 'animal-1',
          date: new Date('2024-05-01T00:00:00.000Z'),
          images: [],
        },
      ];
      prisma.fosterRecord.findMany.mockResolvedValueOnce(records as any);

      const result = await service.listRecords('animal-1');

      jest.useRealTimers();

      const expectedFrom = new Date(now);
      expectedFrom.setMonth(expectedFrom.getMonth() - 6);
      const expectedTo = new Date(now);
      expectedTo.setMonth(expectedTo.getMonth() + 6);

      expect(prisma.fosterRecord.findMany).toHaveBeenCalledWith({
        where: {
          animalId: 'animal-1',
          date: { gte: expectedFrom, lte: expectedTo },
        },
        orderBy: { date: 'asc' },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
      expect(result).toEqual({
        animalId: 'animal-1',
        animal: {
          id: 'animal-1',
          name: 'Buddy',
          status: 'FOSTERING',
          shared: true,
          organization: { id: 'org-1', name: 'Rescue' },
        },
        from: expectedFrom.toISOString(),
        to: expectedTo.toISOString(),
        items: records,
      });
    });

    it('사용자 지정 기간을 그대로 사용한다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        name: 'Buddy',
        status: 'FOSTERING',
        shared: false,
        organization: null,
      } as any);
      prisma.fosterRecord.findMany.mockResolvedValueOnce([] as any);

      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-03-01T00:00:00.000Z';
      await service.listRecords('animal-1', from, to);

      expect(prisma.fosterRecord.findMany).toHaveBeenCalledWith({
        where: {
          animalId: 'animal-1',
          date: { gte: new Date(from), lte: new Date(to) },
        },
        orderBy: { date: 'asc' },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  });

  describe('updateAnimal', () => {
    it('동물이 없으면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateAnimal('animal-1', { userId: 'user-1', role: 'USER' }, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('기관 동물 업데이트는 ORG_ADMIN만 가능하다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      });

      await expect(
        service.updateAnimal('animal-1', { userId: 'user-2', role: 'USER' }, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.update).not.toHaveBeenCalled();
    });

    it('개인 소유 동물은 소유자만 수정할 수 있다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.updateAnimal('animal-1', { userId: 'user-2', role: 'USER' }, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('유효한 요청이면 상태 값을 업데이트한다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });
      prisma.animal.update.mockResolvedValueOnce({ id: 'animal-1' } as any);

      await expect(
        service.updateAnimal(
          'animal-1',
          { userId: 'owner-1', role: 'USER' },
          { name: 'Buddy', shared: true, status: 'ADOPTED' },
        ),
      ).resolves.toEqual({ id: 'animal-1' });
      expect(prisma.animal.update).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
        data: {
          name: 'Buddy',
          shared: true,
          status: 'ADOPTED',
        },
      });
    });
  });

  describe('createRecord', () => {
    it('기관 동물인데 ORG_ADMIN이 아니면 ForbiddenException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      });

      await expect(
        service.createRecord('animal-1', { userId: 'user-1', role: 'USER' }, {
          date: '2024-01-01',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.fosterRecord.create).not.toHaveBeenCalled();
    });

    it('개인 소유 동물인데 작성자가 아니면 ForbiddenException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.createRecord('animal-1', { userId: 'user-2', role: 'USER' }, {
          date: '2024-01-01',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.fosterRecord.create).not.toHaveBeenCalled();
    });

    it('동물이 존재하면 최대 6개의 이미지만 생성한다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'user-1',
      });
      const created = { id: 'record-1', images: [] };
      prisma.fosterRecord.create.mockResolvedValueOnce(created as any);

      await expect(
        service.createRecord(
          'animal-1',
          { userId: 'user-1', role: 'USER' },
          {
            date: '2024-01-01',
            content: 'daily log',
            images: Array.from({ length: 8 }, (_, i) => `https://img/${i}`),
          },
        ),
      ).resolves.toBe(created);
      expect(prisma.fosterRecord.create).toHaveBeenCalledWith({
        data: {
          animalId: 'animal-1',
          date: new Date('2024-01-01'),
          content: 'daily log',
          images: {
            create: Array.from({ length: 6 }, (_, i) => ({
              url: `https://img/${i}`,
              sortOrder: i,
            })),
          },
        },
        include: { images: true },
      });
    });

    it('동물이 없으면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createRecord(
          'animal-1',
          { userId: 'user-1', role: 'USER' },
          { date: '2024-01-01' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRecord', () => {
    it('기록이 없으면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('동물 정보가 없으면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('권한이 없으면 ForbiddenException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-2',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.fosterRecord.delete).not.toHaveBeenCalled();
    });

    it('삭제가 성공하면 삭제 결과를 반환한다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
      });
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'user-1',
      });
      prisma.fosterRecord.delete.mockResolvedValueOnce(undefined);

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).resolves.toEqual({ animalId: 'animal-1', id: 'record-1', deleted: true });
      expect(prisma.fosterRecord.delete).toHaveBeenCalledWith({
        where: { id: 'record-1' },
      });
    });

    it('다른 동물 기록이면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-2',
      });

      await expect(
        service.deleteRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAnimal', () => {
    it('동물이 없으면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('기관 소속 동물인데 ORG_ADMIN이 아니면 ForbiddenException', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: 'org-1',
        ownerUserId: null,
      });

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'user-1',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.delete).not.toHaveBeenCalled();
    });

    it('개인 소유 동물에서 소유자가 아니면 ForbiddenException', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'user-2',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.animal.delete).not.toHaveBeenCalled();
    });

    it('조건이 충족되면 동물을 삭제한다', async () => {
      const { service, prisma } = build();
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'owner-1',
      });
      prisma.animal.delete.mockResolvedValueOnce(undefined);

      await expect(
        service.deleteAnimal('animal-1', {
          userId: 'owner-1',
          role: 'USER',
        }),
      ).resolves.toEqual({ id: 'animal-1', deleted: true });
      expect(prisma.animal.delete).toHaveBeenCalledWith({ where: { id: 'animal-1' } });
    });
  });

  describe('getRecord', () => {
    it('동물 정보가 없으면 기록만 반환한다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-1',
        images: [],
      });
      prisma.animal.findUnique.mockResolvedValueOnce(null);

      await expect(service.getRecord('animal-1', 'record-1')).resolves.toEqual({
        id: 'record-1',
        animalId: 'animal-1',
        images: [],
      });
    });

    it('기록이 없거나 다른 동물면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(null);

      await expect(service.getRecord('animal-1', 'record-1')).rejects.toThrow(
        NotFoundException,
      );

      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-2',
        images: [],
      });

      await expect(service.getRecord('animal-1', 'record-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRecord (additional branches)', () => {
    it('기록이 다른 동물에 속하면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.fosterRecord.findUnique.mockResolvedValueOnce({
        id: 'record-1',
        animalId: 'animal-2',
      });

      await expect(
        service.updateRecord('animal-1', 'record-1', {
          userId: 'user-1',
          role: 'ORG_ADMIN',
        }, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('이미지 없이 업데이트하면 이미지 작업을 건너뜀', async () => {
      const { service, prisma } = build();
      const record = { id: 'record-1', animalId: 'animal-1' };
      prisma.fosterRecord.findUnique.mockResolvedValueOnce(record);
      prisma.animal.findUnique.mockResolvedValueOnce({
        id: 'animal-1',
        orgId: null,
        ownerUserId: 'user-1',
      });
      const tx = {
        fosterRecord: {
          update: jest.fn().mockResolvedValueOnce({ ...record, content: 'updated' }),
        },
        fosterRecordImage: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
          findMany: jest.fn().mockResolvedValueOnce([]),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      await service.updateRecord(
        'animal-1',
        'record-1',
        { userId: 'user-1', role: 'USER' },
        { content: 'updated' },
      );

      expect(tx.fosterRecord.update).toHaveBeenCalled();
      expect(tx.fosterRecordImage.deleteMany).not.toHaveBeenCalled();
      expect(tx.fosterRecordImage.createMany).not.toHaveBeenCalled();
    });
  });
});
