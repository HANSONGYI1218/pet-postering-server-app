import { describe, expect, it, jest } from '@jest/globals';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import { CommunityService } from './community.service';

type MockFn = jest.Mock;

interface PrismaMock {
  post: {
    findMany: MockFn;
    findUnique: MockFn;
    create: MockFn;
    update: MockFn;
    delete: MockFn;
  };
  comment: {
    findMany: MockFn;
    findUnique: MockFn;
    create: MockFn;
    update: MockFn;
    count: MockFn;
    delete: MockFn;
  };
  postBookmark: { upsert: MockFn; count: MockFn; delete: MockFn };
  postLike: { upsert: MockFn; count: MockFn; delete: MockFn };
  commentLike: { findMany: MockFn; upsert: MockFn; delete: MockFn };
  $transaction: MockFn;
}

const baseDate = new Date('2024-01-01T00:00:00.000Z');

const makePost = (id: string) =>
  ({
    id,
    title: `title-${id}`,
    content: `content-${id}`,
    images: [`https://cdn.test/${id}.png`],
    authorId: `author-${id}`,
    author: { id: `author-${id}`, displayName: `Author ${id}` },
    viewCount: 0,
    createdAt: baseDate,
    updatedAt: baseDate,
    _count: { comments: 0, likes: 0 },
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
    _count: { likes: 0 },
  }) as any;

const build = () => {
  const prisma: PrismaMock = {
    post: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    postBookmark: {
      upsert: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    postLike: {
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
  const logger = {
    setContext: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  const service = new CommunityService(
    prisma as unknown as PrismaService,
    logger as never,
  );
  return { service, prisma, logger };
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

      const result = await service.listPosts(100, 'cursor-123', undefined);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        take: 51,
        skip: 1,
        cursor: { id: 'cursor-123' },
        where: {},
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true, likes: true } },
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

      const result = await service.listPosts(0, undefined, undefined);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        take: 2,
        skip: 0,
        where: {},
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true, likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(result.limit).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('applies case-insensitive keyword search to title and content', async () => {
      const { service, prisma } = build();
      prisma.post.findMany.mockResolvedValueOnce([makePost('post-1')]);

      await service.listPosts(10, undefined, 'poodle');

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        take: 11,
        skip: 0,
        where: {
          OR: [
            { title: { contains: 'poodle', mode: 'insensitive' } },
            { content: { contains: 'poodle', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true, likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });
  });

  describe('createPost', () => {
    it('passes author and content to Prisma', async () => {
      const { service, prisma } = build();
      const created = makePost('post-1');
      prisma.post.create.mockResolvedValueOnce(created);

      await expect(
        service.createPost('author-1', {
          title: 'Hello',
          content: 'World',
          images: ['https://cdn.test/1.png'],
        }),
      ).resolves.toMatchObject({
        id: created.id,
        authorId: created.authorId,
        title: created.title,
        content: created.content,
        images: created.images,
        likeCount: 0,
      });
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: {
          authorId: 'author-1',
          title: 'Hello',
          content: 'World',
          images: ['https://cdn.test/1.png'],
        },
        include: {
          _count: { select: { comments: true, likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });
  });

  describe('updatePost', () => {
    it('updates provided fields when requester is author', async () => {
      const { service, prisma } = build();
      prisma.post.findUnique.mockResolvedValueOnce({ authorId: 'author-1' });
      const updated = makePost('post-1');
      prisma.post.update.mockResolvedValueOnce(updated);

      await expect(
        service.updatePost('post-1', 'author-1', { title: 'Edited' }),
      ).resolves.toMatchObject({
        id: updated.id,
        authorId: updated.authorId,
        images: updated.images,
        likeCount: 0,
      });
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { title: 'Edited' },
        include: {
          _count: { select: { comments: true, likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });

    it('throws BadRequest when no fields provided', async () => {
      const { service } = build();

      await expect(service.updatePost('post-1', 'author-1', {})).rejects.toThrow(
        'post-update-empty',
      );
    });

    it('throws NotFound when post missing', async () => {
      const { service, prisma } = build();
      prisma.post.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updatePost('post-1', 'author-1', { title: 'Edited' }),
      ).rejects.toThrow('post-not-found');
    });

    it('throws Forbidden when requester is not author', async () => {
      const { service, prisma } = build();
      prisma.post.findUnique.mockResolvedValueOnce({ authorId: 'someone-else' });

      await expect(
        service.updatePost('post-1', 'author-1', { content: 'Updated' }),
      ).rejects.toThrow('post-update-forbidden');
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it('updates images when provided', async () => {
      const { service, prisma } = build();
      prisma.post.findUnique.mockResolvedValueOnce({ authorId: 'author-1' });
      const updated = makePost('post-1');
      prisma.post.update.mockResolvedValueOnce(updated);

      await service.updatePost('post-1', 'author-1', {
        images: ['https://cdn.test/new.png'],
      });

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { images: ['https://cdn.test/new.png'] },
        include: {
          _count: { select: { comments: true, likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });
  });

  describe('deletePost', () => {
    it('deletes when user is author', async () => {
      const { service, prisma } = build();
      prisma.post.findUnique.mockResolvedValueOnce({ authorId: 'author-1' });
      prisma.post.delete.mockResolvedValueOnce({});

      await expect(service.deletePost('post-1', 'author-1')).resolves.toBeUndefined();
      expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } });
    });

    it('throws NotFound when post missing', async () => {
      const { service, prisma } = build();
      prisma.post.findUnique.mockResolvedValueOnce(null);

      await expect(service.deletePost('post-1', 'author-1')).rejects.toThrow(
        'post-not-found',
      );
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });

    it('throws Forbidden when user not author', async () => {
      const { service, prisma } = build();
      prisma.post.findUnique.mockResolvedValueOnce({ authorId: 'someone-else' });

      await expect(service.deletePost('post-1', 'author-1')).rejects.toThrow(
        'post-delete-forbidden',
      );
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });
  });

  describe('incrementPostView', () => {
    it('increments view count', async () => {
      const { service, prisma } = build();
      prisma.post.update.mockResolvedValueOnce({});

      await expect(service.incrementPostView('post-1')).resolves.toBeUndefined();
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('throws NotFound when post missing', async () => {
      const { service, prisma } = build();
      prisma.post.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: 'mock',
        }),
      );

      await expect(service.incrementPostView('post-1')).rejects.toThrow('post-not-found');
    });
  });

  describe('getPost', () => {
    it('increments view count and returns bookmark state with like info', async () => {
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
          _count: { select: { comments: true, likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(prisma.postBookmark.count).toHaveBeenCalledWith({
        where: { userId: 'user-7', postId: 'post-1' },
      });
      expect(prisma.postLike.count).toHaveBeenCalledWith({
        where: { userId: 'user-7', postId: 'post-1' },
      });
      expect(result).toMatchObject({
        id: 'post-1',
        viewCount: 42,
        isBookmarked: true,
        likeCount: 0,
        liked: false,
      });
    });

    it('sets liked flag when user already liked', async () => {
      const { service, prisma } = build();
      const updated = {
        ...makePost('post-1'),
        viewCount: 9,
        _count: { comments: 1, likes: 5 },
      };
      prisma.post.update.mockResolvedValueOnce(updated);
      prisma.$transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) =>
        cb({ post: { update: prisma.post.update } }),
      );
      prisma.postBookmark.count.mockResolvedValueOnce(0);
      prisma.postLike.count.mockResolvedValueOnce(1);

      const result = await service.getPost('post-1', 'user-9');

      expect(result).toMatchObject({
        likeCount: 5,
        liked: true,
        isBookmarked: false,
      });
    });

    it('throws NotFoundException when the post is missing', async () => {
      const { service, prisma } = build();
      const prismaError = new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'mock',
      });
      prisma.$transaction.mockImplementation(() => {
        throw prismaError;
      });

      await expect(service.getPost('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.postBookmark.count).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException when Prisma fails unexpectedly', async () => {
      const { service, prisma } = build();
      prisma.$transaction.mockImplementation(() => {
        throw new Error('boom');
      });

      await expect(service.getPost('post-1')).rejects.toThrow(
        InternalServerErrorException,
      );
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

    it('ignores Prisma not-found errors when unbookmarking', async () => {
      const { service, prisma, logger } = build();
      prisma.postBookmark.delete.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: 'mock',
        }),
      );

      await expect(service.unbookmark('post-1', 'user-9')).resolves.toEqual({
        postId: 'post-1',
        bookmarked: false,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('throws when unbookmarking fails unexpectedly', async () => {
      const { service, prisma } = build();
      prisma.postBookmark.delete.mockRejectedValueOnce(new Error('boom'));

      await expect(service.unbookmark('post-1', 'user-9')).rejects.toThrow(
        InternalServerErrorException,
      );
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
          _count: { select: { likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      expect(prisma.commentLike.findMany).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        liked: false,
        likeCount: 0,
        replies: [],
      });
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

    it('builds reply threads ordered by creation time', async () => {
      const { service, prisma } = build();
      const parent = makeComment('comment-1', 'post-1');
      const reply = {
        ...makeComment('comment-2', 'post-1'),
        parentId: 'comment-1',
        createdAt: new Date('2024-01-01T01:00:00.000Z'),
      };
      prisma.comment.findMany.mockResolvedValueOnce([parent, reply]);

      const result = await service.listComments('post-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].replies).toHaveLength(1);
      expect(result.items[0].replies[0].id).toBe('comment-2');
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

      const result = await service.createComment('post-1', 'user-1', {
        content: 'hello',
      });
      expect(result).toMatchObject({
        id: created.id,
        postId: 'post-1',
        parentId: null,
        liked: false,
        likeCount: 0,
      });
      expect(result.replies).toEqual([]);
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          postId: 'post-1',
          authorId: 'user-1',
          content: 'hello',
          parentId: null,
        },
        include: {
          _count: { select: { likes: true } },
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

      const result = await service.createComment('post-1', 'user-2', {
        content: 'reply',
        parentId: 'parent-1',
      });
      expect(result).toMatchObject({
        id: created.id,
        parentId: 'parent-1',
        likeCount: 0,
        liked: false,
      });
      expect(result.replies).toEqual([]);
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
          _count: { select: { likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });
  });

  describe('updateComment', () => {
    it('updates comment content when author matches', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'user-1',
        postId: 'post-1',
      });
      const updated = makeComment('comment-1', 'post-1');
      prisma.comment.update.mockResolvedValueOnce(updated);

      const result = await service.updateComment('post-1', 'comment-1', 'user-1', {
        content: 'updated',
      });
      expect(result).toMatchObject({
        id: 'comment-1',
        postId: 'post-1',
        likeCount: 0,
        liked: false,
      });
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { content: 'updated' },
        include: {
          _count: { select: { likes: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
    });

    it('throws NotFound when comment belongs to another post', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'user-1',
        postId: 'post-9',
      });

      await expect(
        service.updateComment('post-1', 'comment-1', 'user-1', { content: 'updated' }),
      ).rejects.toThrow('comment-not-found');
      expect(prisma.comment.update).not.toHaveBeenCalled();
    });

    it('throws Forbidden when user mismatch', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'another',
        postId: 'post-1',
      });

      await expect(
        service.updateComment('post-1', 'comment-1', 'user-1', { content: 'updated' }),
      ).rejects.toThrow('comment-update-forbidden');
      expect(prisma.comment.update).not.toHaveBeenCalled();
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

    it('throws NotFoundException when postId does not match', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'user-1',
        postId: 'post-2',
      });

      await expect(
        service.deleteComment('comment-1', 'user-1', 'post-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the user is not the author', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'other-user',
        postId: 'post-1',
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
        postId: 'post-1',
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
        postId: 'post-1',
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

    it('ignores Prisma not-found errors when unliking', async () => {
      const { service, prisma, logger } = build();
      prisma.commentLike.delete.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: 'mock',
        }),
      );

      await expect(service.unlikeComment('comment-1', 'user-1')).resolves.toEqual({
        commentId: 'comment-1',
        liked: false,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('throws when unliking fails unexpectedly', async () => {
      const { service, prisma } = build();
      prisma.commentLike.delete.mockRejectedValueOnce(new Error('boom'));

      await expect(service.unlikeComment('comment-1', 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('post likes', () => {
    it('upserts a post like and returns updated count', async () => {
      const { service, prisma } = build();
      prisma.postLike.upsert.mockResolvedValueOnce({});
      prisma.postLike.count.mockResolvedValueOnce(5);

      await expect(service.likePost('post-1', 'user-1')).resolves.toEqual({
        postId: 'post-1',
        liked: true,
        likeCount: 5,
      });

      expect(prisma.postLike.upsert).toHaveBeenCalledWith({
        where: { userId_postId: { userId: 'user-1', postId: 'post-1' } },
        update: {},
        create: { userId: 'user-1', postId: 'post-1' },
      });
      expect(prisma.postLike.count).toHaveBeenCalledWith({
        where: { postId: 'post-1' },
      });
    });

    it('handles missing like records when unliking', async () => {
      const { service, prisma, logger } = build();
      prisma.postLike.delete.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: 'mock',
        }),
      );
      prisma.postLike.count.mockResolvedValueOnce(0);

      await expect(service.unlikePost('post-1', 'user-1')).resolves.toEqual({
        postId: 'post-1',
        liked: false,
        likeCount: 0,
      });

      expect(logger.warn).toHaveBeenCalledWith({
        msg: 'post-unlike-missing',
        postId: 'post-1',
        userId: 'user-1',
      });
    });

    it('throws on unexpected errors when unliking', async () => {
      const { service, prisma } = build();
      prisma.postLike.delete.mockRejectedValueOnce(new Error('boom'));

      await expect(service.unlikePost('post-1', 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
