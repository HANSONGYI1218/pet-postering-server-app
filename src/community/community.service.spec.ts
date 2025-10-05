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
    author: { id: `author-${id}`, displayName: `작성자 ${id}` },
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
    author: { id: `author-${id}`, displayName: `작성자 ${id}` },
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
    it('limit을 최대 50으로 고정하고 다음 커서를 계산한다', async () => {
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
      expect(result.items.map((p: any) => p.id)).toEqual(
        basePosts.map((p: any) => p.id),
      );
      expect(result.nextCursor).toBe('post-overflow');
    });

    it('limit이 최소값보다 작으면 1로 보정한다', async () => {
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
    it('작성자와 내용을 Prisma에 전달한다', async () => {
      const { service, prisma } = build();
      const created = { id: 'post-1' } as any;
      prisma.post.create.mockResolvedValueOnce(created);

      await expect(
        service.createPost('author-1', { title: 'Hello', content: 'World' }),
      ).resolves.toBe(created);
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
    it('조회 시 조회수를 증가시키고 북마크 상태를 포함해 반환한다', async () => {
      const { service, prisma } = build();
      const updated = {
        ...makePost('post-1'),
        viewCount: 42,
      };
      prisma.post.update.mockResolvedValueOnce(updated);
      prisma.$transaction.mockImplementation(
        (cb: (tx: unknown) => Promise<unknown>) =>
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

    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.$transaction.mockImplementation(() => {
        throw new Error('not found');
      });

      await expect(service.getPost('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.postBookmark.count).not.toHaveBeenCalled();
    });
  });

  describe('bookmark', () => {
    it('게시글을 북마크 상태로 만든다', async () => {
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

    it('북마크를 해제할 때 삭제 실패도 허용한다', async () => {
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
    it('사용자 정보 없이 호출하면 liked가 항상 false다', async () => {
      const { service, prisma } = build();
      prisma.comment.findMany.mockResolvedValueOnce([
        makeComment('comment-1', 'post-1'),
      ]);

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

    it('사용자 정보가 있으면 좋아요 여부를 병합한다', async () => {
      const { service, prisma } = build();
      prisma.comment.findMany.mockResolvedValueOnce([
        makeComment('comment-1', 'post-1'),
        makeComment('comment-2', 'post-1'),
      ]);
      prisma.commentLike.findMany.mockResolvedValueOnce([
        { commentId: 'comment-2' },
      ]);

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
    it('부모 댓글 없이 생성하면 parentId를 null로 저장한다', async () => {
      const { service, prisma } = build();
      const created = {
        id: 'comment-1',
        postId: 'post-1',
        authorId: 'user-1',
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

    it('부모 댓글이 다른 게시글에 속하면 ForbiddenException을 던진다', async () => {
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

    it('부모 댓글이 존재하지 않으면 ForbiddenException을 던진다', async () => {
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

    it('부모 댓글이 존재하면 parentId를 유지해 생성한다', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'parent-1',
        postId: 'post-1',
      });
      const created = {
        id: 'comment-2',
        postId: 'post-1',
        authorId: 'user-2',
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
    it('댓글이 없으면 NotFoundException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'other-user',
      });

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('답글이 남아있으면 ForbiddenException을 던진다', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'user-1',
      });
      prisma.comment.count.mockResolvedValueOnce(2);

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('모든 조건이 충족되면 댓글을 삭제한다', async () => {
      const { service, prisma } = build();
      prisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        authorId: 'user-1',
      });
      prisma.comment.count.mockResolvedValueOnce(0);
      prisma.comment.delete.mockResolvedValueOnce({});

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).resolves.toEqual({
        commentId: 'comment-1',
        deleted: true,
      });
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });
  });

  describe('likeComment', () => {
    it('댓글 좋아요를 upsert한다', async () => {
      const { service, prisma } = build();
      prisma.commentLike.upsert.mockResolvedValueOnce({});

      await expect(service.likeComment('comment-1', 'user-1')).resolves.toEqual(
        {
          commentId: 'comment-1',
          liked: true,
        },
      );
      expect(prisma.commentLike.upsert).toHaveBeenCalledWith({
        where: {
          userId_commentId: { userId: 'user-1', commentId: 'comment-1' },
        },
        update: {},
        create: { userId: 'user-1', commentId: 'comment-1' },
      });
    });

    it('좋아요를 해제할 때 삭제 실패도 허용한다', async () => {
      const { service, prisma } = build();
      prisma.commentLike.delete.mockRejectedValueOnce(new Error('missing'));

      await expect(
        service.unlikeComment('comment-1', 'user-1'),
      ).resolves.toEqual({
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
