import { describe, expect, it } from '@jest/globals';

import {
  evaluateCommentDeletion,
  mergeCommentLikes,
  resolveParentForCreation,
} from '../comments';

describe('community comments domain', () => {
  describe('mergeCommentLikes', () => {
    it('sets liked flag based on the liked id set', () => {
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
    it('returns parentId null when no parent id is provided', () => {
      expect(resolveParentForCreation(null, 'post-1')).toEqual({
        status: 'ok',
        parentId: null,
      });
    });

    it('returns an error when parent is missing', () => {
      expect(resolveParentForCreation(undefined, 'post-1')).toEqual({
        status: 'error',
        reason: 'parent-not-found',
      });
    });

    it('returns an error when parent post differs', () => {
      expect(resolveParentForCreation({ id: 'p1', postId: 'other' }, 'post-1')).toEqual({
        status: 'error',
        reason: 'invalid-parent-post',
      });
    });

    it('returns parentId as-is when the post matches', () => {
      expect(resolveParentForCreation({ id: 'p1', postId: 'post-1' }, 'post-1')).toEqual({
        status: 'ok',
        parentId: 'p1',
      });
    });
  });

  describe('evaluateCommentDeletion', () => {
    const comment = { id: 'c1', authorId: 'user-1' };

    it('returns not-found error when comment is missing', () => {
      expect(evaluateCommentDeletion(null, 'user-1', 0)).toEqual({
        status: 'error',
        reason: 'comment-not-found',
      });
    });

    it('returns not-owner error when author does not match', () => {
      expect(evaluateCommentDeletion(comment, 'other', 0)).toEqual({
        status: 'error',
        reason: 'comment-not-owner',
      });
    });

    it('returns has-replies error when replies remain', () => {
      expect(evaluateCommentDeletion(comment, 'user-1', 2)).toEqual({
        status: 'error',
        reason: 'comment-has-replies',
      });
    });

    it('returns success when all conditions are met', () => {
      expect(evaluateCommentDeletion(comment, 'user-1', 0)).toEqual({
        status: 'ok',
      });
    });
  });
});
