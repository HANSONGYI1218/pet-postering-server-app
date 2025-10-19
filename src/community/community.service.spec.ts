import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { CommunityService } from './community.service';

type MockFn = jest.Mock;

interface PrismaMock {
  post: { findMany: MockFn; create: MockFn; update: MockFn };
  comment: {
    findMany: MockFn;
    findUnique: MockFn;
    create: MockFn;
    count: MockFn;
    delete: MockFn;
  };
  postBookmark: { upsert: MockFn; count: MockFn; delete: MockFn };
  commentLike: { findMany: MockFn; upsert: MockFn; delete: MockFn };
  $transaction: MockFn;
}

const baseDate = new Date('2024-01-01T00:00:00.000Z');

const makePost = (id: string) =>
  ({
    id,
    title: `title-${id}`,
    content: `content-${id}`,
    authorId: `author-${id}`,
    author: { id: `author-${id}`, displayName: `Author ${id}` },
    viewCount: 0,
    createdAt: baseDate,
    updatedAt: baseDate,
    _count: { comments: 0 },
  }) as any;

const makeComment = (id: string, postId: string) =>
  ({
    id,
    postId,
    authorId: `author-${id}`,
    author: { id: `author-${id}`, displayName: `Author ${id}` },
    content: `comment-${id}`,
    parentId: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    _count: { likes: 0, replies: 0 },
  }) as any;

const build = () => {
  const prisma: PrismaMock = {
    post: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    postBookmark: {
      upsert: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    commentLike: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const service = new CommunityService(prisma as unknown as PrismaService);
  return { service, prisma };
};

describe('CommunityService', () => {
  describe('listPosts', () => {
    it('clamps the limit to 50 and returns the next cursor', async () => {
      const { service, prisma } = build();
      const basePosts = Array.from({ length: 50 }, (_, idx) =>
        makePost(`post-${String(idx)}`),
      );
      const overflow = makePost('post-overflow');
      prisma.post.findMany.mockResolvedValueOnce([...basePosts, overflow]);

      const result = await service.listPosts(100, 'cursor-123');

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        take: 51,
        skip: 1,
        cursor: { id: 'cursor-123' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(result.limit).toBe(50);
      expect(result.items.map((p: any) => p.id)).toEqual(basePosts.map((p: any) => p.id));
      expect(result.nextCursor).toBe('post-overflow');
    });

    it('clamps the limit to 1 when below the minimum', async () => {
      const { service, prisma } = build();
      prisma.post.findMany.mockResolvedValueOnce([makePost('post-1')]);

      const result = await service.listPosts(0);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        take: 2,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(result.limit).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('createPost', () => {
    it('passes author and content to Prisma', async () => {
      const { service, prisma } = build();
      const created = makePost('post-1');
      prisma.post.create.mockResolvedValueOnce(created);

      await expect(
        service.createPost('author-1', { title: 'Hello', content: 'World' }),
      ).resolves.toEqual(created);
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: {
          authorId: 'author-1',
          title: 'Hello',
          content: 'World',
        },
        include: {
          _count: { select: { comments: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });
  });

  describe('getPost', () => {
    it('increments view count and returns bookmark state', async () => {
      const { service, prisma } = build();
      const updated = {
        ...makePost('post-1'),
        viewCount: 42,
      };
      prisma.post.update.mockResolvedValueOnce(updated);
      prisma.$transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) =>
        cb({ post: { update: prisma.post.update } }),
      );
      prisma.postBookmark.count.mockResolvedValueOnce(1);

      const result = await service.getPost('post-1', 'user-7');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { viewCount: { increment: 1 } },
        include: {
          _count: { select: { comments: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(prisma.postBookmark.count).toHaveBeenCalledWith({
        where: { userId: 'user-7', postId: 'post-1' },
      });
      expect(result).toMatchObject({
        id: 'post-1',
        viewCount: 42,
        isBookmarked: true,
      });
    });

    it('throws NotFoundException when the post is missing', async () => {
      const { service, prisma } = build();
      prisma.$transaction.mockImplementation(() => {
        throw new Error('not found');
      });

      await expect(service.getPost('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.postBookmark.count).not.toHaveBeenCalled();
    });
  });

  describe('bookmark', () => {
    it('bookmarks a post', async () => {
      const { service, prisma } = build();
      prisma.postBookmark.upsert.mockResolvedValueOnce({});

      await expect(service.bookmark('post-1', 'user-1')).resolves.toEqual({
        postId: 'post-1',
        bookmarked: true,
      });
      expect(prisma.postBookmark.upsert).toHaveBeenCalledWith({
        where: { userId_postId: { userId: 'user-1', postId: 'post-1' } },
        update: {},
        create: { userId: 'user-1', postId: 'post-1' },
      });
    });

    it('allows deletion failure when unbookmarking', async () => {
      const { service, prisma } = build();
      prisma.postBookmark.delete.mockRejectedValueOnce(new Error('missing'));

      await expect(service.unbookmark('post-1', 'user-9')).resolves.toEqual({
        postId: 'post-1',
        bookmarked: false,
      });
      expect(prisma.postBookmark.delete).toHaveBeenCalledWith({
        where: { userId_postId: { userId: 'user-9', postId: 'post-1' } },
      });
    });
  });

  describe('listComments', () => {
    it('returns liked=false when called without user context', async () => {
      const { service, prisma } = build();
      prisma.comment.findMany.mockResolvedValueOnce([makeComment('comment-1', 'post-1')]);

      const result = await service.listComments('post-1');

      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { postId: 'post-1' },
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { likes: true, replies: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(prisma.commentLike.findMany).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].liked).toBe(false);
    });

    it('merges like state when user context exists', async () => {
      const { service, prisma } = build();
      prisma.comment.findMany.mockResolvedValueOnce([
        makeComment('comment-1', 'post-1'),
        makeComment('comment-2', 'post-1'),
      ]);
      prisma.commentLike.findMany.mockResolvedValueOnce([{ commentId: 'comment-2' }]);

      const result = await service.listComments('post-1', 'user-1');

      expect(prisma.commentLike.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          commentId: { in: ['comment-1', 'comment-2'] },
        },
        select: { commentId: true },
      });
      const likedMap = Object.fromEntries(
        result.items.map((item: any) => [item.id, item.liked]),
      );
      expect(likedMap).toEqual({
        'comment-1': false,
        'comment-2': true,
      });
    });
  });

  describe('createComment', () => {
    it('creates a top-level comment with parentId null', async () => {
      const { service, prisma } = build();
      const created = {
        ...makeComment('comment-1', 'post-1'),
        authorId: 'user-1',
        author: { id: 'user-1', displayName: 'User 1' },
        content: 'hello',
        parentId: null,
      };
      prisma.comment.create.mockResolvedValueOnce(created);

      await expect(
        service.createComment('post-1', 'user-1', { content: 'hello' }),
      ).resolves.toEqual({ ...created, liked: false });
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          postId: 'post-1',
          authorId: 'user-1',
          content: 'hello',
          parentId: null,
        },
        include: {
          _count: { select: { likes: true, replies: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(prisma.comment.findUnique).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when parent belongs to another post', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'parent-1',
        postId: 'another-post',
      });

      await expect(
        service.createComment('post-1', 'user-1', {
          content: 'reply',
          parentId: 'parent-1',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when parent comment is missing', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createComment('post-1', 'user-1', {
          content: 'reply',
          parentId: 'missing-parent',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('preserves parentId when parent comment exists', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'parent-1',
        postId: 'post-1',
      });
      const created = {
        ...makeComment('comment-2', 'post-1'),
        authorId: 'user-2',
        author: { id: 'user-2', displayName: 'User 2' },
        content: 'reply',
        parentId: 'parent-1',
      };
      prisma.comment.create.mockResolvedValueOnce(created);

      await expect(
        service.createComment('post-1', 'user-2', {
          content: 'reply',
          parentId: 'parent-1',
        }),
      ).resolves.toEqual({ ...created, liked: false });
      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
      });
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          postId: 'post-1',
          authorId: 'user-2',
          content: 'reply',
          parentId: 'parent-1',
        },
        include: {
          _count: { select: { likes: true, replies: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });
  });

  describe('deleteComment', () => {
    it('throws NotFoundException when the comment does not exist', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(service.deleteComment('comment-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the user is not the author', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'other-user',
      });

      await expect(service.deleteComment('comment-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when replies remain', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'user-1',
      });
      prisma.comment.count.mockResolvedValueOnce(2);

      await expect(service.deleteComment('comment-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('deletes the comment when all conditions are met', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'user-1',
      });
      prisma.comment.count.mockResolvedValueOnce(0);
      prisma.comment.delete.mockResolvedValueOnce({});

      await expect(service.deleteComment('comment-1', 'user-1')).resolves.toEqual({
        commentId: 'comment-1',
        deleted: true,
      });
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });
  });

  describe('likeComment', () => {
    it('upserts a comment like', async () => {
      const { service, prisma } = build();
      prisma.commentLike.upsert.mockResolvedValueOnce({});

      await expect(service.likeComment('comment-1', 'user-1')).resolves.toEqual({
        commentId: 'comment-1',
        liked: true,
      });
      expect(prisma.commentLike.upsert).toHaveBeenCalledWith({
        where: {
          userId_commentId: { userId: 'user-1', commentId: 'comment-1' },
        },
        update: {},
        create: { userId: 'user-1', commentId: 'comment-1' },
      });
    });

    it('allows deletion failure when unliking', async () => {
      const { service, prisma } = build();
      prisma.commentLike.delete.mockRejectedValueOnce(new Error('missing'));

      await expect(service.unlikeComment('comment-1', 'user-1')).resolves.toEqual({
        commentId: 'comment-1',
        liked: false,
      });
      expect(prisma.commentLike.delete).toHaveBeenCalledWith({
        where: {
          userId_commentId: { userId: 'user-1', commentId: 'comment-1' },
        },
      });
    });
  });
});
