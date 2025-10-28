import type { Prisma, PrismaClient } from '@prisma/client';

import { calculateFosterDays } from '../domain/metrics';

type FosterRecordFinder = Pick<PrismaClient['fosterRecord'], 'findFirst'>;
type FosterRecordAggregator = Pick<PrismaClient['fosterRecord'], 'groupBy'>;

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

export const loadFirstRecordDateMap = async (
  repo: FosterRecordAggregator,
  animalIds: readonly string[],
): Promise<Map<string, Date | null>> => {
  if (animalIds.length === 0) {
    return new Map();
  }
  const groups = await repo.groupBy({
    by: ['animalId'],
    _min: { date: true },
    where: { animalId: { in: [...animalIds] } },
  });
  return new Map(groups.map(({ animalId, _min }) => [animalId, _min.date ?? null]));
};
