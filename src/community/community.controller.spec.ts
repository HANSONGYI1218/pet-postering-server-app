import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  type ExecutionContext,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { OptionalJwtAuthGuard } from '../common/optional-jwt.guard';
import { DEFAULT_POST_PAGE_SIZE } from './community.constants';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

describe('CommunityController', () => {
  const JwtAuthGuard = AuthGuard('jwt');
  let app: INestApplication;
  let service: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    service = {
      listPosts: jest.fn(),
      createPost: jest.fn(),
      getPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn(),
      incrementPostView: jest.fn(),
      bookmark: jest.fn(),
      unbookmark: jest.fn(),
      listComments: jest.fn(),
      createComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
      likeComment: jest.fn(),
      unlikeComment: jest.fn(),
      likePost: jest.fn(),
      unlikePost: jest.fn(),
    } as unknown as jest.Mocked<CommunityService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [CommunityController],
      providers: [{ provide: CommunityService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const rawUser = req.headers['x-test-user'];
          const rawRole = req.headers['x-test-role'];
          const userId = typeof rawUser === 'string' ? rawUser : 'jwt-user';
          const role = typeof rawRole === 'string' ? rawRole : 'USER';
          req.user = { userId, role };
          return true;
        },
      })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const header = req.headers['x-test-user'] as string | undefined;
          if (header) {
            req.user = { userId: header, role: 'USER' };
          }
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /community/posts converts limit to number and forwards to service', async () => {
    service.listPosts.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      limit: 10,
    });

    await request(app.getHttpServer())
      .get('/community/posts')
      .query({ limit: '10', cursor: 'cursor-1' })
      .expect(200)
      .expect({ items: [], nextCursor: null, limit: 10 });

    expect(service.listPosts).toHaveBeenCalledWith(10, 'cursor-1');
  });

  it('GET /community/posts rejects invalid limit values', async () => {
    await request(app.getHttpServer())
      .get('/community/posts')
      .query({ limit: '0' })
      .expect(400);

    expect(service.listPosts).not.toHaveBeenCalled();
  });

  it('GET /community/posts applies the default page size when limit is omitted', async () => {
    service.listPosts.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      limit: DEFAULT_POST_PAGE_SIZE,
    });

    await request(app.getHttpServer()).get('/community/posts').expect(200).expect({
      items: [],
      nextCursor: null,
      limit: DEFAULT_POST_PAGE_SIZE,
    });

    expect(service.listPosts).toHaveBeenCalledWith(DEFAULT_POST_PAGE_SIZE, undefined);
  });

  it('POST /community/posts injects authenticated user id', async () => {
    const response = {
      id: 'post-1',
      title: 'Hello',
      content: 'World',
      images: ['https://cdn.test/image.png'],
    };
    service.createPost.mockResolvedValueOnce(response as any);

    await request(app.getHttpServer())
      .post('/community/posts')
      .set('x-test-user', 'author-1')
      .send({
        title: 'Hello',
        content: 'World',
        images: ['https://cdn.test/image.png'],
      })
      .expect(201)
      .expect(response);

    expect(service.createPost).toHaveBeenCalledWith('author-1', {
      title: 'Hello',
      content: 'World',
      images: ['https://cdn.test/image.png'],
    });
  });

  it('POST /community/posts validates image array length', async () => {
    await request(app.getHttpServer())
      .post('/community/posts')
      .set('x-test-user', 'author-1')
      .send({
        title: 'Hello',
        content: 'World',
        images: Array.from(
          { length: 6 },
          (_, idx) => `https://cdn.test/${String(idx)}.png`,
        ),
      })
      .expect(400);

    expect(service.createPost).not.toHaveBeenCalled();
  });

  it('GET /community/posts/:id passes optional user id when present', async () => {
    const detail = {
      id: 'post-9',
      title: 'Optional',
      content: 'User aware',
      isBookmarked: true,
      liked: true,
      likeCount: 3,
      _count: { comments: 0, likes: 3 },
    };
    service.getPost.mockResolvedValueOnce(detail as any);

    await request(app.getHttpServer())
      .get('/community/posts/post-9')
      .set('x-test-user', 'viewer-7')
      .expect(200)
      .expect(detail);

    expect(service.getPost).toHaveBeenCalledWith('post-9', 'viewer-7');
  });

  it('GET /community/posts/:id/comments forwards undefined when user header missing', async () => {
    const comments = { postId: 'post-3', items: [] };
    service.listComments.mockResolvedValueOnce(comments as any);

    await request(app.getHttpServer())
      .get('/community/posts/post-3/comments')
      .expect(200)
      .expect(comments);

    expect(service.listComments).toHaveBeenCalledWith('post-3', undefined);
  });

  it('POST /community/posts/:id/comments injects user to service', async () => {
    const created = { id: 'comment-1', content: 'hi' };
    service.createComment.mockResolvedValueOnce(created as any);

    await request(app.getHttpServer())
      .post('/community/posts/post-2/comments')
      .set('x-test-user', 'commenter-1')
      .send({ content: 'hi' })
      .expect(201)
      .expect(created);

    expect(service.createComment).toHaveBeenCalledWith('post-2', 'commenter-1', {
      content: 'hi',
    });
  });

  it('POST /community/posts/:id/bookmarks uses authenticated user', async () => {
    service.bookmark.mockResolvedValueOnce({
      postId: 'post-1',
      bookmarked: true,
    } as any);

    await request(app.getHttpServer())
      .post('/community/posts/post-1/bookmarks')
      .set('x-test-user', 'user-7')
      .expect(200)
      .expect({ postId: 'post-1', bookmarked: true });

    expect(service.bookmark).toHaveBeenCalledWith('post-1', 'user-7');
  });

  it('DELETE /community/posts/:id/bookmarks passes user', async () => {
    service.unbookmark.mockResolvedValueOnce({
      postId: 'post-1',
      bookmarked: false,
    } as any);

    await request(app.getHttpServer())
      .delete('/community/posts/post-1/bookmarks')
      .set('x-test-user', 'user-7')
      .expect(200)
      .expect({ postId: 'post-1', bookmarked: false });

    expect(service.unbookmark).toHaveBeenCalledWith('post-1', 'user-7');
  });

  it('PATCH /community/posts/:id updates post content', async () => {
    const updated = { id: 'post-1', title: 'New', content: 'Updated' };
    service.updatePost.mockResolvedValueOnce(updated as any);

    await request(app.getHttpServer())
      .patch('/community/posts/post-1')
      .set('x-test-user', 'author-1')
      .send({ title: 'New' })
      .expect(200)
      .expect(updated);

    expect(service.updatePost).toHaveBeenCalledWith('post-1', 'author-1', {
      title: 'New',
    });
  });

  it('DELETE /community/posts/:id removes the post', async () => {
    service.deletePost.mockResolvedValueOnce();

    await request(app.getHttpServer())
      .delete('/community/posts/post-1')
      .set('x-test-user', 'author-1')
      .expect(204);

    expect(service.deletePost).toHaveBeenCalledWith('post-1', 'author-1');
  });

  it('PATCH /community/posts/:id/views increments without auth', async () => {
    service.incrementPostView.mockResolvedValueOnce();

    await request(app.getHttpServer()).patch('/community/posts/post-3/views').expect(204);

    expect(service.incrementPostView).toHaveBeenCalledWith('post-3');
  });

  it('POST /community/posts/:id/likes injects user for like creation', async () => {
    service.likePost.mockResolvedValueOnce({
      postId: 'post-55',
      liked: true,
      likeCount: 12,
    } as any);

    await request(app.getHttpServer())
      .post('/community/posts/post-55/likes')
      .set('x-test-user', 'user-9')
      .expect(200)
      .expect({ postId: 'post-55', liked: true, likeCount: 12 });

    expect(service.likePost).toHaveBeenCalledWith('post-55', 'user-9');
  });

  it('DELETE /community/posts/:id/likes injects user for unlike', async () => {
    service.unlikePost.mockResolvedValueOnce({
      postId: 'post-55',
      liked: false,
      likeCount: 11,
    } as any);

    await request(app.getHttpServer())
      .delete('/community/posts/post-55/likes')
      .set('x-test-user', 'user-9')
      .expect(200)
      .expect({ postId: 'post-55', liked: false, likeCount: 11 });

    expect(service.unlikePost).toHaveBeenCalledWith('post-55', 'user-9');
  });

  it('POST /community/comments/:id/likes injects user', async () => {
    service.likeComment.mockResolvedValueOnce({
      commentId: 'comment-1',
      liked: true,
    } as any);

    await request(app.getHttpServer())
      .post('/community/comments/comment-1/likes')
      .set('x-test-user', 'user-3')
      .expect(200)
      .expect({ commentId: 'comment-1', liked: true });

    expect(service.likeComment).toHaveBeenCalledWith('comment-1', 'user-3');
  });

  it('DELETE /community/comments/:id/likes removes like with user', async () => {
    service.unlikeComment.mockResolvedValueOnce({
      commentId: 'comment-1',
      liked: false,
    } as any);

    await request(app.getHttpServer())
      .delete('/community/comments/comment-1/likes')
      .set('x-test-user', 'user-3')
      .expect(200)
      .expect({ commentId: 'comment-1', liked: false });

    expect(service.unlikeComment).toHaveBeenCalledWith('comment-1', 'user-3');
  });

  it('DELETE /community/comments/:id injects user for deletion', async () => {
    service.deleteComment.mockResolvedValueOnce({
      commentId: 'comment-1',
      deleted: true,
    } as any);

    await request(app.getHttpServer())
      .delete('/community/comments/comment-1')
      .set('x-test-user', 'user-3')
      .expect(200)
      .expect({ commentId: 'comment-1', deleted: true });

    expect(service.deleteComment).toHaveBeenCalledWith('comment-1', 'user-3');
  });

  it('PATCH /community/posts/:postId/comments/:commentId updates comment', async () => {
    const updated = { id: 'comment-1', content: '변경' };
    service.updateComment.mockResolvedValueOnce(updated as any);

    await request(app.getHttpServer())
      .patch('/community/posts/post-9/comments/comment-1')
      .set('x-test-user', 'user-3')
      .send({ content: '변경' })
      .expect(200)
      .expect(updated);

    expect(service.updateComment).toHaveBeenCalledWith('post-9', 'comment-1', 'user-3', {
      content: '변경',
    });
  });

  it('DELETE /community/posts/:postId/comments/:commentId forwards post id', async () => {
    service.deleteComment.mockResolvedValueOnce({
      commentId: 'comment-3',
      deleted: true,
    } as any);

    await request(app.getHttpServer())
      .delete('/community/posts/post-9/comments/comment-3')
      .set('x-test-user', 'user-3')
      .expect(200)
      .expect({ commentId: 'comment-3', deleted: true });

    expect(service.deleteComment).toHaveBeenCalledWith('comment-3', 'user-3', 'post-9');
  });
});
