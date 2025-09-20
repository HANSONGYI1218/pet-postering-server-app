import { calculateFosterDays } from '../metrics';

describe('calculateFosterDays', () => {
  it('최초 기록 날짜를 우선 사용한다', () => {
    const days = calculateFosterDays({
      now: new Date('2024-01-10T00:00:00.000Z'),
      firstRecordDate: new Date('2024-01-01T00:00:00.000Z'),
      fallbackCreatedAt: new Date('2023-12-15T00:00:00.000Z'),
    });

    expect(days).toBe(9);
  });

  it('기록이 없으면 생성일을 사용한다', () => {
    const days = calculateFosterDays({
      now: new Date('2024-01-10T00:00:00.000Z'),
      firstRecordDate: null,
      fallbackCreatedAt: new Date('2024-01-05T00:00:00.000Z'),
    });

    expect(days).toBe(5);
  });

  it('음수 계산은 0으로 보정한다', () => {
    const days = calculateFosterDays({
      now: new Date('2024-01-01T00:00:00.000Z'),
      firstRecordDate: new Date('2024-01-05T00:00:00.000Z'),
      fallbackCreatedAt: new Date('2024-01-10T00:00:00.000Z'),
    });

    expect(days).toBe(0);
  });
});
