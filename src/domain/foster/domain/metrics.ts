const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface FosterDaysInput {
  now: Date;
  firstRecordDate: Date | null;
  fallbackCreatedAt: Date;
}

export const calculateElapsedDays = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs)) {
    return 0;
  }
  const days = Math.floor(diffMs / MS_PER_DAY);
  return days < 0 ? 0 : days;
};

export const calculateFosterDays = ({
  now,
  firstRecordDate,
  fallbackCreatedAt,
}: FosterDaysInput): number => {
  const base = firstRecordDate ?? fallbackCreatedAt;
  return calculateElapsedDays(base, now);
};
