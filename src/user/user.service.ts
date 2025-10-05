import { Injectable } from '@nestjs/common';

import type {
  UserCommentListItem,
  UserNotificationSettingResult,
  UserPostListItem,
  UserProfileResult,
} from '../domain/user/application/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const profile = user?.profile;

    if (!profile) {
      return {
        id: userId,
        name: null,
        email: null,
        phoneNumber: null,
        zipcode: null,
        address: null,
        addressDetail: null,
        introduction: null,
        isEligibleForFoster: false,
      };
    }

    return {
      id: userId,
      name: profile.name,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      zipcode: profile.zipcode,
      address: profile.address,
      addressDetail: profile.addressDetail,
      introduction: profile.introduction,
      isEligibleForFoster: profile.isEligibleForFoster,
    };
  }

  async getNotificationSetting(
    userId: string,
  ): Promise<UserNotificationSettingResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { notificationSetting: true },
    });

    const setting = user?.notificationSetting;

    if (!setting) {
      return {
        commentEmail: true,
        fosterAnimalInfoEmail: true,
        fosterAnimalInfoKakao: true,
        marketingEmail: false,
        marketingKakao: false,
      };
    }

    return {
      commentEmail: setting.commentEmail,
      fosterAnimalInfoEmail: setting.fosterAnimalInfoEmail,
      fosterAnimalInfoKakao: setting.fosterAnimalInfoKakao,
      marketingEmail: setting.marketingEmail,
      marketingKakao: setting.marketingKakao,
    };
  }

  async listMyPosts(userId: string): Promise<UserPostListItem[]> {
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true } } },
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

    return comments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt,
      likes: likeMap.get(comment.id) ?? 0,
      post: { id: comment.post.id, title: comment.post.title },
    }));
  }
}
