import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import {
  type PostWithRelations,
  toCommentListItem,
  toPostListItem,
} from '../domain/community/application/mappers';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CommunityService.name);
  }

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
    const mappedPosts = posts.map((post) => toPostListItem(post));
    const { items, nextCursor } = preparePaginatedPosts<PostListItem>(
      mappedPosts,
      normalized,
    );
    return { items, nextCursor, limit: normalized };
  }

  async createPost(
    authorId: string,
    dto: { title: string; content: string },
  ): Promise<PostListItem> {
    const created = await this.prisma.post.create({
      data: { authorId, title: dto.title, content: dto.content },
      include: {
        _count: { select: { comments: true } },
        author: { select: { id: true, displayName: true } },
      },
    });
    return toPostListItem(created);
  }

  async getPost(postId: string, userId?: string): Promise<PostDetail> {
    const post = await this.fetchPostWithViewIncrement(postId);

    if (!post) throw new NotFoundException('post-not-found');

    const mapped = toPostListItem(post);

    if (!userId) return { ...mapped, isBookmarked: false };

    const bookmarkCount = await this.prisma.postBookmark.count({
      where: { userId, postId },
    });
    return { ...mapped, isBookmarked: bookmarkCount > 0 };
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
      .catch((error: unknown) => {
        this.logger.warn({
          msg: 'post-unbookmark-failed',
          postId,
          userId,
          err: error,
        });
        return undefined;
      });
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
    const baseItems: CommentListItem[] = comments.map((comment) =>
      toCommentListItem(comment),
    );
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
      return toCommentListItem(created);
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
    return toCommentListItem(created);
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
      .catch((error: unknown) => {
        this.logger.warn({
          msg: 'comment-unlike-failed',
          commentId,
          userId,
          err: error,
        });
        return undefined;
      });
    return { commentId, liked: false };
  }

  private async fetchPostWithViewIncrement(
    postId: string,
  ): Promise<PostWithRelations | null> {
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
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn({
          msg: 'post-not-found',
          postId,
        });
        return null;
      }
      this.logger.error({
        msg: 'post-fetch-failed',
        postId,
        err: error,
      });
      throw new InternalServerErrorException('post-fetch-failed', {
        cause: error,
      });
    }
  }
}
