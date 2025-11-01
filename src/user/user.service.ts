import { Injectable } from '@nestjs/common';

import type {
  UpdateUserNotificationSettingInput,
  UpdateUserProfileInput,
  UserCommentListItem,
  UserNotificationSettingResult,
  UserPostListItem,
  UserProfileResult,
} from '../domain/user/application/types';
import { PrismaService } from '../prisma/prisma.service';

type ProfileFragment = Partial<
  Omit<UserProfileResult, 'id'> & { userId?: string | null }
>;

const stripProfileUserId = (
  fragment: ProfileFragment,
): Omit<ProfileFragment, 'userId'> => {
  const clone: ProfileFragment = { ...fragment };
  delete clone.userId;
  return clone;
};

const DEFAULT_PROFILE_FIELDS: Omit<UserProfileResult, 'id'> = {
  name: null,
  email: null,
  phoneNumber: null,
  zipcode: null,
  address: null,
  addressDetail: null,
  introduction: null,
  isEligibleForFoster: false,
};

const toUserProfileResult = (
  userId: string,
  profile: ProfileFragment | null,
): UserProfileResult => {
  if (!profile) {
    return { id: userId, ...DEFAULT_PROFILE_FIELDS };
  }

  return {
    id: userId,
    ...DEFAULT_PROFILE_FIELDS,
    ...stripProfileUserId(profile),
  };
};

const DEFAULT_NOTIFICATION_SETTING: UserNotificationSettingResult = {
  commentEmail: true,
  fosterAnimalInfoEmail: true,
  fosterAnimalInfoKakao: true,
  marketingEmail: false,
  marketingKakao: false,
};

const toNotificationSettingResult = (
  setting: Partial<UserNotificationSettingResult> | null,
): UserNotificationSettingResult => ({
  ...DEFAULT_NOTIFICATION_SETTING,
  ...(setting ?? {}),
});

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return toUserProfileResult(userId, user?.profile ?? null);
  }

  async getNotificationSetting(userId: string): Promise<UserNotificationSettingResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { notificationSetting: true },
    });

    return toNotificationSettingResult(user?.notificationSetting ?? null);
  }

  async updateProfile(
    userId: string,
    payload: UpdateUserProfileInput,
  ): Promise<UserProfileResult> {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { ...payload },
      create: { userId, ...payload },
    });

    return toUserProfileResult(userId, profile);
  }

  async updateNotificationSetting(
    userId: string,
    payload: UpdateUserNotificationSettingInput,
  ): Promise<UserNotificationSettingResult> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationSetting: {
          upsert: {
            update: { ...payload },
            create: { ...payload },
          },
        },
      },
      select: { notificationSetting: true },
    });

    return toNotificationSettingResult(user.notificationSetting ?? null);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async listMyPosts(userId: string): Promise<UserPostListItem[]> {
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true, likes: true } } },
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      views: post.viewCount,
      commentCount: post._count.comments,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }));
  }

  async listMyComments(userId: string): Promise<UserCommentListItem[]> {
    const comments = await this.prisma.comment.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: { select: { id: true, title: true } },
      },
    });

    if (comments.length === 0) {
      return [];
    }

    const likeCounts = await this.prisma.commentLike.groupBy({
      by: ['commentId'],
      _count: { commentId: true },
      where: { commentId: { in: comments.map((comment) => comment.id) } },
    });

    const likeMap = new Map<string, number>(
      likeCounts.map((item) => [item.commentId, item._count.commentId]),
    );

    return comments.map((comment) => {
      const post = comment.post as { id: string; title: string } | null;
      return {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        createdAt: comment.createdAt,
        likes: likeMap.get(comment.id) ?? 0,
        post: post ? { id: post.id, title: post.title } : null,
      } satisfies UserCommentListItem;
    });
  }
}
