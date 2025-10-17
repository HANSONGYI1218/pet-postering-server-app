import { resolveRecordWindow, toImageCreateInputs } from '../records';

describe('records domain helpers', () => {
  describe('resolveRecordWindow', () => {
    it('returns a six-month window when from/to are undefined', () => {
      const now = new Date('2024-06-15T00:00:00.000Z');

      const result = resolveRecordWindow(undefined, undefined, now);

      const expectedFrom = new Date(now);
      expectedFrom.setMonth(expectedFrom.getMonth() - 6);
      const expectedTo = new Date(now);
      expectedTo.setMonth(expectedTo.getMonth() + 6);

      expect(result).toEqual({ from: expectedFrom, to: expectedTo });
    });

    it('uses the provided from/to values as-is', () => {
      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-03-01T00:00:00.000Z';

      expect(resolveRecordWindow(from, to)).toEqual({
        from: new Date(from),
        to: new Date(to),
      });
    });

    it('returns an error when dates are invalid', () => {
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
    it('returns up to six images with sort order', () => {
      const result = toImageCreateInputs(
        Array.from({ length: 8 }, (_, i) => `https://img/${String(i)}`),
      );

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ url: 'https://img/0', sortOrder: 0 });
      expect(result[5]).toEqual({ url: 'https://img/5', sortOrder: 5 });
    });

    it('returns an empty array when no images are provided', () => {
      expect(toImageCreateInputs(undefined)).toEqual([]);
    });
  });
});
