import { describe, expect, it } from '@jest/globals';

import { communityPostSeeds, communityUserSeeds } from '../../../prisma/seed-data';

describe('community seed data', () => {
  it('includes at least one community post seed', () => {
    expect(communityPostSeeds.length).toBeGreaterThan(0);
  });

  it('ensures every post seed references a valid author', () => {
    const authorIds = new Set(communityUserSeeds.map((user) => user.id));

    communityPostSeeds.forEach((post) => {
      expect(authorIds.has(post.authorId)).toBe(true);
    });
  });
});
