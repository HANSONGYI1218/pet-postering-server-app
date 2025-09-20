import {
  evaluateCommentDeletion,
  mergeCommentLikes,
  resolveParentForCreation,
} from '../comments';

describe('community comments domain', () => {
  describe('mergeCommentLikes', () => {
    it('liked id 집합을 기반으로 liked 플래그를 설정한다', () => {
      const comments = [
        { id: 'c1', liked: false },
        { id: 'c2', liked: false },
      ];

      const result = mergeCommentLikes(comments, new Set(['c2']));

      expect(result).toEqual([
        { id: 'c1', liked: false },
        { id: 'c2', liked: true },
      ]);
      expect(comments).toEqual([
        { id: 'c1', liked: false },
        { id: 'c2', liked: false },
      ]);
    });
  });

  describe('resolveParentForCreation', () => {
    it('부모 id가 없으면 parentId null을 반환한다', () => {
      expect(resolveParentForCreation(null, 'post-1')).toEqual({
        status: 'ok',
        parentId: null,
      });
    });

    it('부모가 존재하지 않으면 에러를 반환한다', () => {
      expect(resolveParentForCreation(undefined, 'post-1')).toEqual({
        status: 'error',
        reason: 'parent-not-found',
      });
    });

    it('부모 게시글이 다르면 에러를 반환한다', () => {
      expect(
        resolveParentForCreation({ id: 'p1', postId: 'other' }, 'post-1'),
      ).toEqual({
        status: 'error',
        reason: 'invalid-parent-post',
      });
    });

    it('같은 게시글이면 parentId를 그대로 사용한다', () => {
      expect(
        resolveParentForCreation({ id: 'p1', postId: 'post-1' }, 'post-1'),
      ).toEqual({
        status: 'ok',
        parentId: 'p1',
      });
    });
  });

  describe('evaluateCommentDeletion', () => {
    const comment = { id: 'c1', authorId: 'user-1' };

    it('댓글이 없으면 not-found 에러', () => {
      expect(evaluateCommentDeletion(null, 'user-1', 0)).toEqual({
        status: 'error',
        reason: 'comment-not-found',
      });
    });

    it('작성자가 다르면 not-owner 에러', () => {
      expect(evaluateCommentDeletion(comment, 'other', 0)).toEqual({
        status: 'error',
        reason: 'comment-not-owner',
      });
    });

    it('답글이 남아있으면 has-replies 에러', () => {
      expect(evaluateCommentDeletion(comment, 'user-1', 2)).toEqual({
        status: 'error',
        reason: 'comment-has-replies',
      });
    });

    it('모든 조건이 통과하면 success', () => {
      expect(evaluateCommentDeletion(comment, 'user-1', 0)).toEqual({
        status: 'ok',
      });
    });
  });
});
