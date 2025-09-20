import { clampPostLimit, preparePaginatedPosts } from '../posts';

describe('community posts domain', () => {
  describe('clampPostLimit', () => {
    it('최솟값보다 작으면 1로 보정한다', () => {
      expect(clampPostLimit(0)).toBe(1);
      expect(clampPostLimit(-10)).toBe(1);
    });

    it('최댓값보다 크면 50으로 보정한다', () => {
      expect(clampPostLimit(999)).toBe(50);
    });

    it('범위 내 값은 그대로 유지한다', () => {
      expect(clampPostLimit(15)).toBe(15);
    });
  });

  describe('preparePaginatedPosts', () => {
    const makePost = (id: string) => ({
      id,
      title: `title-${id}`,
    });

    it('리스트가 limit보다 길면 overflow를 잘라내고 nextCursor를 반환한다', () => {
      const posts = [makePost('p1'), makePost('p2'), makePost('p3')];

      const result = preparePaginatedPosts(posts, 2);

      expect(result.items).toEqual([makePost('p1'), makePost('p2')]);
      expect(result.nextCursor).toBe('p3');
    });

    it('limit 이하이면 nextCursor가 null이다', () => {
      const posts = [makePost('p1')];

      const result = preparePaginatedPosts(posts, 5);

      expect(result.items).toEqual([makePost('p1')]);
      expect(result.nextCursor).toBeNull();
    });
  });
});
