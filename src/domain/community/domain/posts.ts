export const clampPostLimit = (limit: number): number => {
  if (Number.isNaN(limit)) return 20;
  return Math.min(Math.max(limit, 1), 50);
};

export const preparePaginatedPosts = <T extends { id: string }>(
  posts: readonly T[],
  limit: number,
): { items: T[]; nextCursor: string | null } => {
  if (limit < 1) throw new Error('invalid-limit');
  if (posts.length <= limit) {
    return { items: [...posts], nextCursor: null };
  }
  const items = posts.slice(0, limit);
  const overflow = posts[limit];
  return { items, nextCursor: overflow.id };
};
