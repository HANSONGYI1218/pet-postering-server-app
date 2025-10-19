const SIX_MONTHS = 6;

const shiftMonths = (base: Date, months: number): Date => {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
};

export type RecordWindowResult =
  | { status: 'error'; reason: 'invalid-from-date' | 'invalid-to-date' }
  | { from: Date; to: Date };

const parseIso = (value: string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const resolveRecordWindow = (
  from?: string,
  to?: string,
  now: Date = new Date(),
): RecordWindowResult => {
  const parsedFrom = parseIso(from);
  if (from && !parsedFrom) {
    return { status: 'error', reason: 'invalid-from-date' };
  }
  const parsedTo = parseIso(to);
  if (to && !parsedTo) {
    return { status: 'error', reason: 'invalid-to-date' };
  }

  if (parsedFrom && parsedTo) {
    return { from: parsedFrom, to: parsedTo };
  }

  return {
    from: parsedFrom ?? shiftMonths(now, -SIX_MONTHS),
    to: parsedTo ?? shiftMonths(now, SIX_MONTHS),
  };
};

export interface ImageCreateInput {
  url: string;
  sortOrder: number;
}

export const toImageCreateInputs = (images?: string[]): ImageCreateInput[] => {
  if (!images?.length) {
    return [];
  }
  return images.slice(0, 6).map((url, index) => ({ url, sortOrder: index }));
};
