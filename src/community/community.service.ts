import {
  BadRequestException,
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
  LikePostResponse,
  ListCommentsResult,
  ListPostsResult,
  PostDetail,
  PostListItem,
} from '../domain/community/application/types';
import {
  evaluateCommentDeletion,
  resolveParentForCreation,
} from '../domain/community/domain/comments';
import { clampPostLimit, preparePaginatedPosts } from '../domain/community/domain/posts';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_POST_PAGE_SIZE } from './community.constants';

const POST_RELATIONS = {
  _count: { select: { comments: true, likes: true } },
  author: { select: { id: true, displayName: true } },
} as const;

const COMMENT_RELATIONS = {
  _count: { select: { likes: true } },
  author: { select: { id: true, displayName: true } },
} as const;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CommunityService.name);
  }

  async listPosts(
    limit = DEFAULT_POST_PAGE_SIZE,
    cursor?: string,
  ): Promise<ListPostsResult> {
    const normalized = clampPostLimit(limit);
    const posts = await this.prisma.post.findMany({
      take: normalized + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: POST_RELATIONS,
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
    dto: { title: string; content: string; images?: string[] },
  ): Promise<PostListItem> {
    const created = await this.prisma.post.create({
      data: {
        authorId,
        title: dto.title,
        content: dto.content,
        images: dto.images ?? [],
      },
      include: POST_RELATIONS,
    });
    return toPostListItem(created);
  }

  async updatePost(
    postId: string,
    userId: string,
    dto: { title?: string; content?: string; images?: string[] },
  ): Promise<PostListItem> {
    if (!dto.title && !dto.content && !dto.images) {
      throw new BadRequestException('post-update-empty');
    }
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) {
      throw new NotFoundException('post-not-found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('post-update-forbidden');
    }
    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.content ? { content: dto.content } : {}),
        ...(dto.images ? { images: dto.images } : {}),
      },
      include: POST_RELATIONS,
    });
    return toPostListItem(updated);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) {
      throw new NotFoundException('post-not-found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('post-delete-forbidden');
    }
    await this.prisma.post.delete({ where: { id: postId } });
  }

  async incrementPostView(postId: string): Promise<void> {
    try {
      await this.prisma.post.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      });
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException('post-not-found');
      }
      this.logger.error({
        msg: 'post-view-increment-failed',
        postId,
        err: error,
      });
      throw new InternalServerErrorException('post-view-increment-failed', {
        cause: error,
      });
    }
  }

  async getPost(postId: string, userId?: string): Promise<PostDetail> {
    const post = await this.fetchPostWithViewIncrement(postId);

    if (!post) {
      throw new NotFoundException('post-not-found');
    }

    const mapped = toPostListItem(post);

    if (!userId) {
      return { ...mapped, isBookmarked: false, liked: false };
    }

    const [bookmarkCount, likedCount] = await Promise.all([
      this.prisma.postBookmark.count({
        where: { userId, postId },
      }),
      this.prisma.postLike.count({
        where: { userId, postId },
      }),
    ]);
    return {
      ...mapped,
      isBookmarked: bookmarkCount > 0,
      liked: likedCount > 0,
    };
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
    try {
      await this.prisma.postBookmark.delete({
        where: { userId_postId: { userId, postId } },
      });
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        this.logger.warn({
          msg: 'post-unbookmark-missing',
          postId,
          userId,
        });
      } else {
        this.logger.error({
          msg: 'post-unbookmark-failed',
          postId,
          userId,
          err: error,
        });
        throw new InternalServerErrorException('post-unbookmark-failed', {
          cause: error,
        });
      }
    }
    return { postId, bookmarked: false };
  }

  async likePost(postId: string, userId: string): Promise<LikePostResponse> {
    await this.prisma.postLike.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });

    const likeCount = await this.prisma.postLike.count({ where: { postId } });

    return { postId, liked: true, likeCount };
  }

  async unlikePost(postId: string, userId: string): Promise<LikePostResponse> {
    try {
      await this.prisma.postLike.delete({
        where: { userId_postId: { userId, postId } },
      });
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        this.logger.warn({
          msg: 'post-unlike-missing',
          postId,
          userId,
        });
      } else {
        this.logger.error({
          msg: 'post-unlike-failed',
          postId,
          userId,
          err: error,
        });
        throw new InternalServerErrorException('post-unlike-failed', {
          cause: error,
        });
      }
    }

    const likeCount = await this.prisma.postLike.count({ where: { postId } });

    return { postId, liked: false, likeCount };
  }

  async listComments(postId: string, userId?: string): Promise<ListCommentsResult> {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: COMMENT_RELATIONS,
    });
    const baseItems: CommentListItem[] = comments.map((comment) =>
      toCommentListItem(comment),
    );
    if (baseItems.length === 0) {
      return { postId, items: [] };
    }

    const likedSet = new Set<string>();
    if (userId) {
      const liked = await this.prisma.commentLike.findMany({
        where: { userId, commentId: { in: baseItems.map((c) => c.id) } },
        select: { commentId: true },
      });
      liked.forEach((item) => likedSet.add(item.commentId));
    }

    const nodes = baseItems.map((item) => ({
      ...item,
      liked: likedSet.has(item.id),
      replies: [...item.replies],
    }));
    const byId = new Map(nodes.map((item) => [item.id, item]));
    const roots: CommentListItem[] = [];

    for (const item of nodes) {
      const parentId = item.parentId;
      if (parentId) {
        const parent = byId.get(parentId);
        if (parent) {
          parent.replies = [...parent.replies, item];
          continue;
        }
      }
      roots.push(item);
    }

    const sortByCreatedAt = (left: CommentListItem, right: CommentListItem): number =>
      left.createdAt.getTime() - right.createdAt.getTime();

    const sortReplies = (items: CommentListItem[]): void => {
      items.sort(sortByCreatedAt);
      items.forEach((child: CommentListItem): void => {
        sortReplies(child.replies);
      });
    };

    sortReplies(roots);

    return { postId, items: roots };
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
        include: COMMENT_RELATIONS,
      });
      return toCommentListItem(created);
    }

    const parent = await this.prisma.comment.findUnique({
      where: { id: parentId },
    });
    const resolution = resolveParentForCreation(parent ?? undefined, postId);
    if (resolution.status === 'error') {
      throw new ForbiddenException(resolution.reason);
    }

    const created = await this.prisma.comment.create({
      data: {
        postId,
        authorId,
        content: dto.content,
        parentId: resolution.parentId,
      },
      include: COMMENT_RELATIONS,
    });
    return toCommentListItem(created);
  }

  async updateComment(
    postId: string,
    commentId: string,
    userId: string,
    dto: { content: string },
  ): Promise<CommentListItem> {
    const existing = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true },
    });
    const authorId = existing?.authorId;

    if (existing?.postId !== postId) {
      throw new NotFoundException('comment-not-found');
    }
    if (authorId !== userId) {
      throw new ForbiddenException('comment-update-forbidden');
    }
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: COMMENT_RELATIONS,
    });
    return toCommentListItem(updated);
  }

  async deleteComment(
    commentId: string,
    userId: string,
    postId?: string,
  ): Promise<DeleteCommentResponse> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true },
    });
    const childCount = comment
      ? await this.prisma.comment.count({
          where: { parentId: commentId },
        })
      : 0;
    if (comment && postId && comment.postId !== postId) {
      throw new NotFoundException('comment-not-found');
    }
    const evaluation = evaluateCommentDeletion(comment, userId, childCount);
    if (evaluation.status === 'error') {
      if (evaluation.reason === 'comment-not-found') {
        throw new NotFoundException(evaluation.reason);
      }
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
    try {
      await this.prisma.commentLike.delete({
        where: { userId_commentId: { userId, commentId } },
      });
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        this.logger.warn({
          msg: 'comment-unlike-missing',
          commentId,
          userId,
        });
      } else {
        this.logger.error({
          msg: 'comment-unlike-failed',
          commentId,
          userId,
          err: error,
        });
        throw new InternalServerErrorException('comment-unlike-failed', {
          cause: error,
        });
      }
    }
    return { commentId, liked: false };
  }

  private isPrismaNotFoundError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
    );
  }

  private async fetchPostWithViewIncrement(
    postId: string,
  ): Promise<PostWithRelations | null> {
    try {
      return await this.prisma.$transaction(async (tx) =>
        tx.post.update({
          where: { id: postId },
          data: { viewCount: { increment: 1 } },
          include: POST_RELATIONS,
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
