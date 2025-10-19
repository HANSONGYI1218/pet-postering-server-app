import { describe, expect, it } from '@jest/globals';

import {
  POST_PAGE_SIZE_DEFAULT,
  POST_PAGE_SIZE_MAX,
  POST_PAGE_SIZE_MIN,
} from '../constants';
import { clampPostLimit, preparePaginatedPosts } from '../posts';

describe('community posts domain', () => {
  describe('clampPostLimit', () => {
    it('clamps values below the minimum boundary', () => {
      expect(clampPostLimit(0)).toBe(POST_PAGE_SIZE_MIN);
      expect(clampPostLimit(-10)).toBe(POST_PAGE_SIZE_MIN);
    });

    it('clamps values above the maximum boundary', () => {
      expect(clampPostLimit(999)).toBe(POST_PAGE_SIZE_MAX);
    });

    it('keeps values within the range unchanged', () => {
      expect(clampPostLimit(15)).toBe(15);
    });

    it('returns the default page size when limit is NaN', () => {
      expect(clampPostLimit(Number.NaN)).toBe(POST_PAGE_SIZE_DEFAULT);
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
