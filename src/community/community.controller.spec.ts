import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { OptionalJwtAuthGuard } from '../common/optional-jwt.guard';

describe('CommunityController', () => {
  const JwtAuthGuard = AuthGuard('jwt');
  let app: INestApplication;
  let service: jest.Mocked<CommunityService>;

  beforeEach(async () => {
    service = {
      listPosts: jest.fn(),
      createPost: jest.fn(),
      getPost: jest.fn(),
      bookmark: jest.fn(),
      unbookmark: jest.fn(),
      listComments: jest.fn(),
      createComment: jest.fn(),
      deleteComment: jest.fn(),
      likeComment: jest.fn(),
      unlikeComment: jest.fn(),
    } as unknown as jest.Mocked<CommunityService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [CommunityController],
      providers: [{ provide: CommunityService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const userId = (req.headers['x-test-user'] as string) ?? 'jwt-user';
          const role = (req.headers['x-test-role'] as string) ?? 'USER';
          req.user = { userId, role };
          return true;
        },
      })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const header = req.headers['x-test-user'] as string | undefined;
          if (header) req.user = { userId: header, role: 'USER' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /community/posts converts limit to number and forwards to service', async () => {
    service.listPosts.mockResolvedValueOnce({ items: [], nextCursor: null, limit: 10 });

    await request(app.getHttpServer())
      .get('/community/posts')
      .query({ limit: '10', cursor: 'cursor-1' })
      .expect(200)
      .expect({ items: [], nextCursor: null, limit: 10 });

    expect(service.listPosts).toHaveBeenCalledWith(10, 'cursor-1');
  });

  it('POST /community/posts injects authenticated user id', async () => {
    const response = { id: 'post-1', title: 'Hello', content: 'World' };
    service.createPost.mockResolvedValueOnce(response as any);

    await request(app.getHttpServer())
      .post('/community/posts')
      .set('x-test-user', 'author-1')
      .send({ title: 'Hello', content: 'World' })
      .expect(201)
      .expect(response);

    expect(service.createPost).toHaveBeenCalledWith('author-1', {
      title: 'Hello',
      content: 'World',
    });
  });

  it('GET /community/posts/:id passes optional user id when present', async () => {
    const detail = {
      id: 'post-9',
      title: 'Optional',
      content: 'User aware',
      isBookmarked: true,
      _count: { comments: 0 },
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
    service.bookmark.mockResolvedValueOnce({ postId: 'post-1', bookmarked: true } as any);

    await request(app.getHttpServer())
      .post('/community/posts/post-1/bookmarks')
      .set('x-test-user', 'user-7')
      .expect(201)
      .expect({ postId: 'post-1', bookmarked: true });

    expect(service.bookmark).toHaveBeenCalledWith('post-1', 'user-7');
  });

  it('DELETE /community/posts/:id/bookmarks passes user', async () => {
    service.unbookmark.mockResolvedValueOnce({ postId: 'post-1', bookmarked: false } as any);

    await request(app.getHttpServer())
      .delete('/community/posts/post-1/bookmarks')
      .set('x-test-user', 'user-7')
      .expect(200)
      .expect({ postId: 'post-1', bookmarked: false });

    expect(service.unbookmark).toHaveBeenCalledWith('post-1', 'user-7');
  });

  it('POST /community/comments/:id/likes injects user', async () => {
    service.likeComment.mockResolvedValueOnce({ commentId: 'comment-1', liked: true } as any);

    await request(app.getHttpServer())
      .post('/community/comments/comment-1/likes')
      .set('x-test-user', 'user-3')
      .expect(201)
      .expect({ commentId: 'comment-1', liked: true });

    expect(service.likeComment).toHaveBeenCalledWith('comment-1', 'user-3');
  });

  it('DELETE /community/comments/:id/likes removes like with user', async () => {
    service.unlikeComment.mockResolvedValueOnce({ commentId: 'comment-1', liked: false } as any);

    await request(app.getHttpServer())
      .delete('/community/comments/comment-1/likes')
      .set('x-test-user', 'user-3')
      .expect(200)
      .expect({ commentId: 'comment-1', liked: false });

    expect(service.unlikeComment).toHaveBeenCalledWith('comment-1', 'user-3');
  });

  it('DELETE /community/comments/:id injects user for deletion', async () => {
    service.deleteComment.mockResolvedValueOnce({ commentId: 'comment-1', deleted: true } as any);

    await request(app.getHttpServer())
      .delete('/community/comments/comment-1')
      .set('x-test-user', 'user-3')
      .expect(200)
      .expect({ commentId: 'comment-1', deleted: true });

    expect(service.deleteComment).toHaveBeenCalledWith('comment-1', 'user-3');
  });
});
