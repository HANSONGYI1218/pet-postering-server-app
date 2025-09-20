interface FosterDaysInput {
  now: Date;
  firstRecordDate: Date | null;
  fallbackCreatedAt: Date;
}

export const calculateFosterDays = ({
  now,
  firstRecordDate,
  fallbackCreatedAt,
}: FosterDaysInput): number => {
  const base = firstRecordDate ?? fallbackCreatedAt;
  const diffMs = now.getTime() - base.getTime();
  if (Number.isNaN(diffMs)) return 0;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
};
