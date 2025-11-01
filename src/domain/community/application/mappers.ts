import type { Comment, Post } from '@prisma/client';

import type { CommentListItem, PostListItem } from './types';

export type PostWithRelations = Post & {
  author: { id: string; displayName: string | null };
  _count: { comments: number; likes: number };
};

type CommentWithRelations = Comment & {
  author: { id: string; displayName: string | null };
  _count: { likes: number };
};

export const toPostListItem = (post: PostWithRelations): PostListItem => ({
  id: post.id,
  authorId: post.authorId,
  title: post.title,
  content: post.content,
  images: post.images as string[],
  viewCount: post.viewCount,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  author: {
    id: post.author.id,
    displayName: post.author.displayName,
  },
  likeCount: post._count.likes,
  _count: {
    comments: post._count.comments,
    likes: post._count.likes,
  },
});

export const toCommentListItem = (comment: CommentWithRelations): CommentListItem => ({
  id: comment.id,
  postId: comment.postId,
  authorId: comment.authorId,
  parentId: comment.parentId,
  content: comment.content,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  liked: false,
  author: {
    id: comment.author.id,
    displayName: comment.author.displayName,
  },
  likeCount: comment._count.likes,
  replies: [],
});
