import type { Comment, Post } from '@prisma/client';

export interface PostListItem extends Post {
  author: { id: string; displayName: string | null };
  _count: { comments: number };
}

export interface PostDetail extends PostListItem {
  isBookmarked: boolean;
}

export interface BookmarkResponse {
  postId: string;
  bookmarked: boolean;
}

export interface CommentListItem extends Comment {
  author: { id: string; displayName: string | null };
  liked: boolean;
  _count: { likes: number; replies: number };
}

export interface ListPostsResult {
  items: PostListItem[];
  nextCursor: string | null;
  limit: number;
}

export interface ListCommentsResult {
  postId: string;
  items: CommentListItem[];
}

export interface DeleteCommentResponse {
  commentId: string;
  deleted: true;
}

export interface LikeCommentResponse {
  commentId: string;
  liked: boolean;
}
