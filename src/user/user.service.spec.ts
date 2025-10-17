import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './user.service';

type MockFn = jest.Mock;

interface PrismaMock {
  user: {
    findUnique: MockFn;
    update: MockFn;
    delete: MockFn;
  };
  userProfile: {
    upsert: MockFn;
  };
  post: {
    findMany: MockFn;
  };
  comment: {
    findMany: MockFn;
  };
  commentLike: {
    groupBy: MockFn;
  };
}

const buildService = () => {
  const prisma: PrismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userProfile: { upsert: jest.fn() },
    post: { findMany: jest.fn() },
    comment: { findMany: jest.fn() },
    commentLike: { groupBy: jest.fn() },
  };

  const service = new UsersService(prisma as unknown as PrismaService);

  return { service, prisma };
};

describe('UsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns user profile information', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        profile: {
          name: 'Alex Kim',
          email: 'hong@example.com',
          phoneNumber: '010-0000-0000',
          zipcode: '01234',
          address: 'Jongno-gu, Seoul',
          addressDetail: '1-1',
          introduction: 'Introduction',
          isEligibleForFoster: true,
        },
        notificationSetting: null,
      });

      await expect(service.getProfile('user-1')).resolves.toEqual({
        id: 'user-1',
        name: 'Alex Kim',
        email: 'hong@example.com',
        phoneNumber: '010-0000-0000',
        zipcode: '01234',
        address: 'Jongno-gu, Seoul',
        addressDetail: '1-1',
        introduction: 'Introduction',
        isEligibleForFoster: true,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { profile: true },
      });
    });

    it('returns defaults when profile is missing', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        profile: null,
      });

      await expect(service.getProfile('user-1')).resolves.toEqual({
        id: 'user-1',
        name: null,
        email: null,
        phoneNumber: null,
        zipcode: null,
        address: null,
        addressDetail: null,
        introduction: null,
        isEligibleForFoster: false,
      });
    });
  });

  describe('getNotificationSetting', () => {
    it('returns notification settings', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValueOnce({
        notificationSetting: {
          commentEmail: true,
          fosterAnimalInfoEmail: false,
          fosterAnimalInfoKakao: true,
          marketingEmail: false,
          marketingKakao: true,
        },
      });

      await expect(service.getNotificationSetting('user-1')).resolves.toEqual({
        commentEmail: true,
        fosterAnimalInfoEmail: false,
        fosterAnimalInfoKakao: true,
        marketingEmail: false,
        marketingKakao: true,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { notificationSetting: true },
      });
    });

    it('returns defaults when notification setting is missing', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValueOnce({
        notificationSetting: null,
      });

      await expect(service.getNotificationSetting('user-1')).resolves.toEqual({
        commentEmail: true,
        fosterAnimalInfoEmail: true,
        fosterAnimalInfoKakao: true,
        marketingEmail: false,
        marketingKakao: false,
      });
    });
  });

  describe('updateProfile', () => {
    it('updates user profile', async () => {
      const { service, prisma } = buildService();
      const payload = {
        name: 'Alex Kim',
        email: 'hong@example.com',
        phoneNumber: '010-0000-0000',
        zipcode: '01234',
        address: 'Jongno-gu, Seoul',
        addressDetail: '1-1',
        introduction: 'Introduction',
      } as const;

      prisma.userProfile.upsert.mockResolvedValueOnce({
        userId: 'user-1',
        isEligibleForFoster: true,
        ...payload,
      });

      await expect(service.updateProfile('user-1', payload)).resolves.toEqual({
        id: 'user-1',
        isEligibleForFoster: true,
        ...payload,
      });

      expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: payload,
        create: { userId: 'user-1', ...payload },
      });
    });
  });

  describe('updateNotificationSetting', () => {
    it('updates user notification settings', async () => {
      const { service, prisma } = buildService();
      const payload = {
        commentEmail: false,
        fosterAnimalInfoEmail: true,
        fosterAnimalInfoKakao: false,
        marketingEmail: true,
        marketingKakao: true,
      } as const;

      prisma.user.update.mockResolvedValueOnce({
        notificationSetting: { ...payload },
      });

      await expect(service.updateNotificationSetting('user-1', payload)).resolves.toEqual(
        payload,
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          notificationSetting: {
            upsert: {
              update: payload,
              create: payload,
            },
          },
        },
        select: { notificationSetting: true },
      });
    });
  });

  describe('deleteAccount', () => {
    it('deletes a user account', async () => {
      const { service, prisma } = buildService();

      prisma.user.delete.mockResolvedValueOnce(undefined);

      await expect(service.deleteAccount('user-1')).resolves.toBeUndefined();

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('listMyPosts', () => {
    it('returns posts authored by the user', async () => {
      const { service, prisma } = buildService();
      prisma.post.findMany.mockResolvedValueOnce([
        {
          id: 'post-1',
          title: 'First Post',
          content: 'Content',
          viewCount: 10,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-02T00:00:00Z'),
          _count: { comments: 3 },
        },
      ]);

      await expect(service.listMyPosts('user-1')).resolves.toEqual([
        {
          id: 'post-1',
          title: 'First Post',
          content: 'Content',
          views: 10,
          commentCount: 3,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-02T00:00:00Z'),
        },
      ]);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: { authorId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { comments: true } } },
      });
    });
  });

  describe('listMyComments', () => {
    it('returns comments authored by the user', async () => {
      const { service, prisma } = buildService();
      prisma.comment.findMany.mockResolvedValueOnce([
        {
          id: 'comment-1',
          postId: 'post-1',
          authorId: 'user-1',
          content: 'Comment',
          createdAt: new Date('2025-01-03T00:00:00Z'),
          post: {
            id: 'post-1',
            title: 'First Post',
          },
        },
      ]);
      prisma.commentLike.groupBy.mockResolvedValueOnce([
        { commentId: 'comment-1', _count: { commentId: 2 } },
      ]);

      await expect(service.listMyComments('user-1')).resolves.toEqual([
        {
          id: 'comment-1',
          postId: 'post-1',
          content: 'Comment',
          createdAt: new Date('2025-01-03T00:00:00Z'),
          likes: 2,
          post: { id: 'post-1', title: 'First Post' },
        },
      ]);

      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { authorId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: {
          post: { select: { id: true, title: true } },
        },
      });
      expect(prisma.commentLike.groupBy).toHaveBeenCalledWith({
        by: ['commentId'],
        _count: { commentId: true },
        where: { commentId: { in: ['comment-1'] } },
      });
    });

    it('returns an empty array when the user has no comments', async () => {
      const { service, prisma } = buildService();
      prisma.comment.findMany.mockResolvedValueOnce([]);

      await expect(service.listMyComments('user-1')).resolves.toEqual([]);
      expect(prisma.commentLike.groupBy).not.toHaveBeenCalled();
    });
  });
});
