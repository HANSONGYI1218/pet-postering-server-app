export interface PostAuthor {
  id: string;
  displayName: string | null;
}

export interface PostCount {
  comments: number;
  likes: number;
}

export interface PostListItem {
  id: string;
  authorId: string;
  title: string;
  content: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: PostAuthor;
  likeCount: number;
  _count: PostCount;
}

export interface PostDetail extends PostListItem {
  isBookmarked: boolean;
  liked: boolean;
}

export interface BookmarkResponse {
  postId: string;
  bookmarked: boolean;
}

export interface CommentAuthor {
  id: string;
  displayName: string | null;
}

export interface CommentListItem {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  liked: boolean;
  author: CommentAuthor;
  likeCount: number;
  replies: CommentListItem[];
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

export interface LikePostResponse {
  postId: string;
  liked: boolean;
  likeCount: number;
}
