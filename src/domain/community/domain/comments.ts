export interface MinimalComment {
  id: string;
  authorId: string;
}

export interface MinimalParentComment {
  id: string;
  postId: string;
}

export type ParentResolution =
  | { status: 'ok'; parentId: string | null }
  | { status: 'error'; reason: 'parent-not-found' | 'invalid-parent-post' };

export type DeletionEvaluation =
  | { status: 'ok' }
  | {
      status: 'error';
      reason: 'comment-not-found' | 'comment-not-owner' | 'comment-has-replies';
    };

export const mergeCommentLikes = <T extends { id: string; liked: boolean }>(
  comments: readonly T[],
  likedIds: ReadonlySet<string>,
): T[] => comments.map((comment) => ({ ...comment, liked: likedIds.has(comment.id) }));

export const resolveParentForCreation = (
  parent: MinimalParentComment | null | undefined,
  expectedPostId: string,
): ParentResolution => {
  if (parent === null) return { status: 'ok', parentId: null };
  if (parent === undefined) return { status: 'error', reason: 'parent-not-found' };
  if (parent.postId !== expectedPostId)
    return { status: 'error', reason: 'invalid-parent-post' };
  return { status: 'ok', parentId: parent.id };
};

export const evaluateCommentDeletion = (
  comment: MinimalComment | null,
  userId: string,
  childCount: number,
): DeletionEvaluation => {
  if (!comment) return { status: 'error', reason: 'comment-not-found' };
  if (comment.authorId !== userId)
    return { status: 'error', reason: 'comment-not-owner' };
  if (childCount > 0) return { status: 'error', reason: 'comment-has-replies' };
  return { status: 'ok' };
};
