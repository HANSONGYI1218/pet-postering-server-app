import {
  POST_PAGE_SIZE_DEFAULT,
  POST_PAGE_SIZE_MAX,
  POST_PAGE_SIZE_MIN,
} from './constants';

export const clampPostLimit = (limit: number): number => {
  if (Number.isNaN(limit)) {
    return POST_PAGE_SIZE_DEFAULT;
  }
  return Math.min(Math.max(limit, POST_PAGE_SIZE_MIN), POST_PAGE_SIZE_MAX);
};

export const preparePaginatedPosts = <T extends { id: string }>(
  posts: readonly T[],
  limit: number,
): { items: T[]; nextCursor: string | null } => {
  if (limit < POST_PAGE_SIZE_MIN) {
    throw new Error('invalid-limit');
  }
  if (posts.length <= limit) {
    return { items: [...posts], nextCursor: null };
  }
  const items = posts.slice(0, limit);
  const overflow = posts[limit];
  return { items, nextCursor: overflow.id };
};
