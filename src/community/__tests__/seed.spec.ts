import { describe, expect, it } from '@jest/globals';

import { communityPostSeeds, communityUserSeeds } from '../../../prisma/seed-data';

describe('community seed data', () => {
  it('최소 한 개 이상의 커뮤니티 게시글 시드를 포함한다', () => {
    expect(communityPostSeeds.length).toBeGreaterThan(0);
  });

  it('모든 게시글 시드는 유효한 작성자를 참조한다', () => {
    const authorIds = new Set(communityUserSeeds.map((user) => user.id));

    communityPostSeeds.forEach((post) => {
      expect(authorIds.has(post.authorId)).toBe(true);
    });
  });
});
