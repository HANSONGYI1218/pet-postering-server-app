import type { Prisma, PrismaClient } from '@prisma/client';

import { calculateFosterDays } from '../domain/metrics';

type FosterRecordFinder = Pick<PrismaClient['fosterRecord'], 'findFirst'>;

const defaultFindFirstArgs = (animalId: string): Prisma.FosterRecordFindFirstArgs => ({
  where: { animalId },
  orderBy: { date: 'asc' },
  select: { date: true },
});

export const resolveFosterDaysForAnimal = async (
  repo: FosterRecordFinder,
  params: {
    animalId: string;
    fallbackCreatedAt: Date;
    now: Date;
  },
): Promise<number> => {
  const record = await repo.findFirst(defaultFindFirstArgs(params.animalId));

  return calculateFosterDays({
    now: params.now,
    firstRecordDate: record?.date ?? null,
    fallbackCreatedAt: params.fallbackCreatedAt,
  });
};
