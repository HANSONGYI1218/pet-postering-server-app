import { resolveRecordWindow, toImageCreateInputs } from '../records';

describe('records domain helpers', () => {
  describe('resolveRecordWindow', () => {
    it('from/to 미지정 시 현재 기준 6개월 전후를 반환한다', () => {
      const now = new Date('2024-06-15T00:00:00.000Z');

      const result = resolveRecordWindow(undefined, undefined, now);

      const expectedFrom = new Date(now);
      expectedFrom.setMonth(expectedFrom.getMonth() - 6);
      const expectedTo = new Date(now);
      expectedTo.setMonth(expectedTo.getMonth() + 6);

      expect(result).toEqual({ from: expectedFrom, to: expectedTo });
    });

    it('from/to가 주어지면 그대로 사용한다', () => {
      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-03-01T00:00:00.000Z';

      expect(resolveRecordWindow(from, to)).toEqual({
        from: new Date(from),
        to: new Date(to),
      });
    });

    it('유효하지 않은 날짜는 error를 반환한다', () => {
      expect(resolveRecordWindow('not-a-date', undefined)).toEqual({
        status: 'error',
        reason: 'invalid-from-date',
      });
      expect(resolveRecordWindow(undefined, 'bad-date')).toEqual({
        status: 'error',
        reason: 'invalid-to-date',
      });
    });
  });

  describe('toImageCreateInputs', () => {
    it('이미지를 최대 6개까지 정렬 순서와 함께 반환한다', () => {
      const result = toImageCreateInputs(
        Array.from({ length: 8 }, (_, i) => `https://img/${String(i)}`),
      );

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ url: 'https://img/0', sortOrder: 0 });
      expect(result[5]).toEqual({ url: 'https://img/5', sortOrder: 5 });
    });

    it('이미지가 없으면 빈 배열을 반환한다', () => {
      expect(toImageCreateInputs(undefined)).toEqual([]);
    });
  });
});
