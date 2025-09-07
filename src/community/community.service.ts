import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async listPosts(limit = 20, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 50);
    const items = await this.prisma.post.findMany({
      take: take + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true } } },
    });
    let nextCursor: string | null = null;
    if (items.length > take) {
      const next = items.pop();
      nextCursor = next!.id;
    }
    return { items, nextCursor, limit: take };
  }

  async createPost(authorId: string, dto: { title: string; content: string }) {
    return this.prisma.post.create({
      data: { authorId, title: dto.title, content: dto.content },
    });
  }

  async getPost(postId: string, userId?: string) {
    const post = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
        include: { _count: { select: { comments: true } } },
      });
      return updated;
    }).catch(() => null);
    if (!post) throw new NotFoundException('Post not found');

    let isBookmarked = false;
    if (userId) {
      const count = await this.prisma.postBookmark.count({
        where: { userId, postId },
      });
      isBookmarked = count > 0;
    }
    return { ...post, isBookmarked };
  }

  async bookmark(postId: string, userId: string) {
    await this.prisma.postBookmark.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });
    return { postId, bookmarked: true };
  }

  async unbookmark(postId: string, userId: string) {
    await this.prisma.postBookmark.delete({
      where: { userId_postId: { userId, postId } },
    }).catch(() => undefined);
    return { postId, bookmarked: false };
  }

  async listComments(postId: string, userId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { likes: true, replies: true } } },
    });
    if (!userId) return { postId, items: comments.map((c) => ({ ...c, liked: false })) };
    const ids = comments.map((c) => c.id);
    const liked = await this.prisma.commentLike.findMany({
      where: { userId, commentId: { in: ids } },
      select: { commentId: true },
    });
    const likedSet = new Set(liked.map((l) => l.commentId));
    return { postId, items: comments.map((c) => ({ ...c, liked: likedSet.has(c.id) })) };
  }

  async createComment(postId: string, authorId: string, dto: { content: string; parentId?: string }) {
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.postId !== postId) throw new ForbiddenException('Invalid parent');
    }
    return this.prisma.comment.create({
      data: { postId, authorId, content: dto.content, parentId: dto.parentId ?? null },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Not owner');
    const childCount = await this.prisma.comment.count({ where: { parentId: commentId } });
    if (childCount > 0) throw new ForbiddenException('Has replies');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { commentId, deleted: true };
  }

  async likeComment(commentId: string, userId: string) {
    await this.prisma.commentLike.upsert({
      where: { userId_commentId: { userId, commentId } },
      update: {},
      create: { userId, commentId },
    });
    return { commentId, liked: true };
  }

  async unlikeComment(commentId: string, userId: string) {
    await this.prisma.commentLike.delete({
      where: { userId_commentId: { userId, commentId } },
    }).catch(() => undefined);
    return { commentId, liked: false };
  }
}

