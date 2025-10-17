import { clampPostLimit, preparePaginatedPosts } from '../posts';

describe('community posts domain', () => {
  describe('clampPostLimit', () => {
    it('clamps values below the minimum to 1', () => {
      expect(clampPostLimit(0)).toBe(1);
      expect(clampPostLimit(-10)).toBe(1);
    });

    it('clamps values above the maximum to 50', () => {
      expect(clampPostLimit(999)).toBe(50);
    });

    it('keeps values within the range unchanged', () => {
      expect(clampPostLimit(15)).toBe(15);
    });
  });

  describe('preparePaginatedPosts', () => {
    const makePost = (id: string) => ({
      id,
      title: `title-${id}`,
    });

    it('truncates overflow and returns nextCursor when list exceeds limit', () => {
      const posts = [makePost('p1'), makePost('p2'), makePost('p3')];

      const result = preparePaginatedPosts(posts, 2);

      expect(result.items).toEqual([makePost('p1'), makePost('p2')]);
      expect(result.nextCursor).toBe('p3');
    });

    it('returns nextCursor null when items are within the limit', () => {
      const posts = [makePost('p1')];

      const result = preparePaginatedPosts(posts, 5);

      expect(result.items).toEqual([makePost('p1')]);
      expect(result.nextCursor).toBeNull();
    });
  });
});
