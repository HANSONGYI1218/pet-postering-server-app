import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';
import type {
  Animal,
  AnimalStatus,
  FosterRecord,
  FosterRecordImage,
} from '@prisma/client';

@Injectable()
export class FosterService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnimals(
    status?: string,
  ): Promise<{ items: (Animal & { fosterDays: number })[] }> {
    const where = status ? { status: status as unknown as AnimalStatus } : {};
    const animals = await this.prisma.animal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const items = await Promise.all(
      animals.map(async (a) => ({
        ...a,
        fosterDays: await awaitDays(this.prisma, a.id, a.createdAt),
      })),
    );
    return { items };
  }

  async listSharedAnimals(): Promise<{
    items: (Animal & { fosterDays: number })[];
  }> {
    const animals = await this.prisma.animal.findMany({
      where: { shared: true },
      orderBy: { createdAt: 'desc' },
    });
    const items = await Promise.all(
      animals.map(async (a) => ({
        ...a,
        fosterDays: await awaitDays(this.prisma, a.id, a.createdAt),
      })),
    );
    return { items };
  }

  async createAnimal(
    user: AuthUser,
    dto: { name: string; orgId?: string; shared?: boolean },
  ): Promise<Animal> {
    if (dto.orgId) {
      if (user.role !== 'ORG_ADMIN') throw new ForbiddenException('ORG only');
      return this.prisma.animal.create({
        data: { name: dto.name, orgId: dto.orgId, shared: !!dto.shared },
      });
    }
    return this.prisma.animal.create({
      data: { name: dto.name, ownerUserId: user.userId, shared: !!dto.shared },
    });
  }

  async updateAnimal(
    id: string,
    user: AuthUser,
    dto: { name?: string; shared?: boolean; status?: string },
  ): Promise<Animal> {
    const a = await this.prisma.animal.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.orgId) {
      if (user.role !== 'ORG_ADMIN') throw new ForbiddenException('ORG only');
    } else if (a.ownerUserId !== user.userId) {
      throw new ForbiddenException('Not owner');
    }
    return this.prisma.animal.update({
      where: { id },
      data: {
        name: dto.name,
        shared: dto.shared,
        status: (dto.status as unknown as AnimalStatus) ?? undefined,
      },
    });
  }

  async deleteAnimal(
    id: string,
    user: AuthUser,
  ): Promise<{ id: string; deleted: true }> {
    const a = await this.prisma.animal.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.orgId) {
      if (user.role !== 'ORG_ADMIN') throw new ForbiddenException('ORG only');
    } else if (a.ownerUserId !== user.userId) {
      throw new ForbiddenException('Not owner');
    }
    await this.prisma.animal.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listRecords(
    animalId: string,
    from?: string,
    to?: string,
  ): Promise<ListRecordsResult> {
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now);
    if (!from) fromDate.setMonth(fromDate.getMonth() - 6);
    const toDate = to ? new Date(to) : new Date(now);
    if (!to) toDate.setMonth(toDate.getMonth() + 6);
    // 동물 및 기관 메타 조회
    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!animal) throw new NotFoundException('Animal not found');
    const items = await this.prisma.fosterRecord.findMany({
      where: { animalId, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'asc' },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    return {
      animalId,
      animal: {
        id: animal.id,
        name: animal.name,
        status: animal.status,
        shared: animal.shared,
        organization: animal.organization ?? null,
      },
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      items,
    };
  }

  async getRecord(
    animalId: string,
    recordId: string,
  ): Promise<FosterRecordDetail> {
    const rec = await this.prisma.fosterRecord.findUnique({
      where: { id: recordId },
      include: { images: true },
    });
    if (!rec || rec.animalId !== animalId)
      throw new NotFoundException('Record not found');
    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
      include: { organization: { select: { id: true, name: true } } },
    });
    return animal
      ? {
          ...rec,
          animal: {
            id: animal.id,
            name: animal.name,
            status: animal.status,
            shared: animal.shared,
            organization: animal.organization ?? null,
          },
        }
      : (rec as FosterRecordBase);
  }

  async createRecord(
    animalId: string,
    user: AuthUser,
    dto: { date: string; content?: string; images?: string[] },
  ): Promise<FosterRecordBase> {
    const a = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.orgId) {
      if (user.role !== 'ORG_ADMIN') throw new ForbiddenException('ORG only');
    } else if (a.ownerUserId !== user.userId) {
      throw new ForbiddenException('Not owner');
    }
    const imgs = (dto.images ?? []).slice(0, 6);
    return this.prisma.fosterRecord.create({
      data: {
        animalId,
        date: new Date(dto.date),
        content: dto.content,
        images: { create: imgs.map((url, i) => ({ url, sortOrder: i })) },
      },
      include: { images: true },
    });
  }

  async updateRecord(
    animalId: string,
    recordId: string,
    user: AuthUser,
    dto: { date?: string; content?: string; images?: string[] },
  ): Promise<FosterRecordBase> {
    const rec = await this.prisma.fosterRecord.findUnique({
      where: { id: recordId },
    });
    if (!rec || rec.animalId !== animalId)
      throw new NotFoundException('Record not found');
    const a = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.orgId) {
      if (user.role !== 'ORG_ADMIN') throw new ForbiddenException('ORG only');
    } else if (a.ownerUserId !== user.userId) {
      throw new ForbiddenException('Not owner');
    }
    const imgs = dto.images?.slice(0, 6);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fosterRecord.update({
        where: { id: recordId },
        data: {
          content: dto.content,
          date: dto.date ? new Date(dto.date) : undefined,
        },
      });
      if (imgs) {
        await tx.fosterRecordImage.deleteMany({ where: { recordId } });
        await tx.fosterRecordImage.createMany({
          data: imgs.map((url, i) => ({ recordId, url, sortOrder: i })),
        });
      }
      return {
        ...updated,
        images: await tx.fosterRecordImage.findMany({
          where: { recordId },
          orderBy: { sortOrder: 'asc' },
        }),
      };
    });
  }

  async deleteRecord(
    animalId: string,
    recordId: string,
    user: AuthUser,
  ): Promise<{ animalId: string; id: string; deleted: true }> {
    const rec = await this.prisma.fosterRecord.findUnique({
      where: { id: recordId },
    });
    if (!rec || rec.animalId !== animalId)
      throw new NotFoundException('Record not found');
    const a = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.orgId) {
      if (user.role !== 'ORG_ADMIN') throw new ForbiddenException('ORG only');
    } else if (a.ownerUserId !== user.userId) {
      throw new ForbiddenException('Not owner');
    }
    await this.prisma.fosterRecord.delete({ where: { id: recordId } });
    return { animalId, id: recordId, deleted: true };
  }
}

async function awaitDays(
  prisma: PrismaService,
  animalId: string,
  fallback: Date,
) {
  const first = await prisma.fosterRecord.findFirst({
    where: { animalId },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  const start = first?.date ?? fallback;
  const diff = Math.floor(
    (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

// ===== Types for service returns =====
export type FosterRecordBase = FosterRecord & { images: FosterRecordImage[] };

export type FosterRecordDetail =
  | FosterRecordBase
  | (FosterRecordBase & {
      animal: {
        id: string;
        name: string;
        status: AnimalStatus;
        shared: boolean;
        organization: { id: string; name: string } | null;
      };
    });

export interface ListRecordsResult {
  animalId: string;
  animal: {
    id: string;
    name: string;
    status: AnimalStatus;
    shared: boolean;
    organization: { id: string; name: string } | null;
  };
  from: string;
  to: string;
  items: FosterRecordBase[];
}
