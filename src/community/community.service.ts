import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  BookmarkResponse,
  CommentListItem,
  DeleteCommentResponse,
  LikeCommentResponse,
  ListCommentsResult,
  ListPostsResult,
  PostDetail,
  PostListItem,
} from '../domain/community/application/types';
import {
  evaluateCommentDeletion,
  mergeCommentLikes,
  resolveParentForCreation,
} from '../domain/community/domain/comments';
import { clampPostLimit, preparePaginatedPosts } from '../domain/community/domain/posts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async listPosts(limit = 20, cursor?: string): Promise<ListPostsResult> {
    const normalized = clampPostLimit(limit);
    const posts = await this.prisma.post.findMany({
      take: normalized + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { comments: true } },
        author: { select: { id: true, displayName: true } },
      },
    });
    const { items, nextCursor } = preparePaginatedPosts<PostListItem>(posts, normalized);
    return { items, nextCursor, limit: normalized };
  }

  async createPost(
    authorId: string,
    dto: { title: string; content: string },
  ): Promise<PostListItem> {
    return this.prisma.post.create({
      data: { authorId, title: dto.title, content: dto.content },
      include: {
        _count: { select: { comments: true } },
        author: { select: { id: true, displayName: true } },
      },
    });
  }

  async getPost(postId: string, userId?: string): Promise<PostDetail> {
    const post = await (async () => {
      try {
        return await this.prisma.$transaction(async (tx) =>
          tx.post.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
            include: {
              _count: { select: { comments: true } },
              author: { select: { id: true, displayName: true } },
            },
          }),
        );
      } catch {
        return null;
      }
    })();

    if (!post) throw new NotFoundException('post-not-found');

    if (!userId) return { ...post, isBookmarked: false };

    const bookmarkCount = await this.prisma.postBookmark.count({
      where: { userId, postId },
    });
    return { ...post, isBookmarked: bookmarkCount > 0 };
  }

  async bookmark(postId: string, userId: string): Promise<BookmarkResponse> {
    await this.prisma.postBookmark.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });
    return { postId, bookmarked: true };
  }

  async unbookmark(postId: string, userId: string): Promise<BookmarkResponse> {
    await this.prisma.postBookmark
      .delete({ where: { userId_postId: { userId, postId } } })
      .catch(() => undefined);
    return { postId, bookmarked: false };
  }

  async listComments(postId: string, userId?: string): Promise<ListCommentsResult> {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { likes: true, replies: true } },
        author: { select: { id: true, displayName: true } },
      },
    });
    const baseItems: CommentListItem[] = comments.map((comment) => ({
      ...comment,
      liked: false,
    }));
    if (!userId || baseItems.length === 0) return { postId, items: baseItems };

    const liked = await this.prisma.commentLike.findMany({
      where: { userId, commentId: { in: baseItems.map((c) => c.id) } },
      select: { commentId: true },
    });
    const likedSet = new Set(liked.map((item) => item.commentId));
    return { postId, items: mergeCommentLikes(baseItems, likedSet) };
  }

  async createComment(
    postId: string,
    authorId: string,
    dto: { content: string; parentId?: string },
  ): Promise<CommentListItem> {
    const parentId = dto.parentId?.trim();
    if (!parentId) {
      const created = await this.prisma.comment.create({
        data: {
          postId,
          authorId,
          content: dto.content,
          parentId: null,
        },
        include: {
          _count: { select: { likes: true, replies: true } },
          author: { select: { id: true, displayName: true } },
        },
      });
      return { ...created, liked: false };
    }

    const parent = await this.prisma.comment.findUnique({
      where: { id: parentId },
    });
    const resolution = resolveParentForCreation(parent ?? undefined, postId);
    if (resolution.status === 'error') throw new ForbiddenException(resolution.reason);

    const created = await this.prisma.comment.create({
      data: {
        postId,
        authorId,
        content: dto.content,
        parentId: resolution.parentId,
      },
      include: {
        _count: { select: { likes: true, replies: true } },
        author: { select: { id: true, displayName: true } },
      },
    });
    return { ...created, liked: false };
  }

  async deleteComment(commentId: string, userId: string): Promise<DeleteCommentResponse> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    const childCount = comment
      ? await this.prisma.comment.count({
          where: { parentId: commentId },
        })
      : 0;
    const evaluation = evaluateCommentDeletion(comment, userId, childCount);
    if (evaluation.status === 'error') {
      if (evaluation.reason === 'comment-not-found')
        throw new NotFoundException(evaluation.reason);
      throw new ForbiddenException(evaluation.reason);
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { commentId, deleted: true };
  }

  async likeComment(commentId: string, userId: string): Promise<LikeCommentResponse> {
    await this.prisma.commentLike.upsert({
      where: { userId_commentId: { userId, commentId } },
      update: {},
      create: { userId, commentId },
    });
    return { commentId, liked: true };
  }

  async unlikeComment(commentId: string, userId: string): Promise<LikeCommentResponse> {
    await this.prisma.commentLike
      .delete({ where: { userId_commentId: { userId, commentId } } })
      .catch(() => undefined);
    return { commentId, liked: false };
  }
}
