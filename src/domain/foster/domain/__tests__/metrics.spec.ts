import { describe, expect, it } from '@jest/globals';

import { calculateFosterDays } from '../metrics';

describe('calculateFosterDays', () => {
  it('prefers the first record date when available', () => {
    const days = calculateFosterDays({
      now: new Date('2024-01-10T00:00:00.000Z'),
      firstRecordDate: new Date('2024-01-01T00:00:00.000Z'),
      fallbackCreatedAt: new Date('2023-12-15T00:00:00.000Z'),
    });

    expect(days).toBe(9);
  });

  it('uses fallback createdAt when no records exist', () => {
    const days = calculateFosterDays({
      now: new Date('2024-01-10T00:00:00.000Z'),
      firstRecordDate: null,
      fallbackCreatedAt: new Date('2024-01-05T00:00:00.000Z'),
    });

    expect(days).toBe(5);
  });

  it('clamps negative differences to zero', () => {
    const days = calculateFosterDays({
      now: new Date('2024-01-01T00:00:00.000Z'),
      firstRecordDate: new Date('2024-01-05T00:00:00.000Z'),
      fallbackCreatedAt: new Date('2024-01-10T00:00:00.000Z'),
    });

    expect(days).toBe(0);
  });
});
