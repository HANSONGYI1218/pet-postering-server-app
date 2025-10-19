import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/optional-jwt.guard';
import type { AuthUser } from '../common/types';
import type {
  BookmarkResponse,
  CommentListItem,
  DeleteCommentResponse,
  LikeCommentResponse,
  ListCommentsResult,
  ListPostsResult,
  PostDetail,
  PostListItem,
} from '../domain/community/application/types';
import { CommunityService } from './community.service';
import {
  BookmarkResponseDto,
  CommentListItemDto,
  CreateCommentDto,
  CreatePostDto,
  DeleteCommentResponseDto,
  LikeCommentResponseDto,
  ListCommentsResponseDto,
  PostDetailDto,
  PostListItemDto,
  PostListResponseDto,
} from './dto/community.dto';

@ApiTags('Community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  @Get('posts')
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor (post id) for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (1-50)',
    example: 20,
  })
  @ApiOperation({
    summary: 'List posts with comment count (cursor pagination)',
  })
  @ApiOkResponse({ type: PostListResponseDto })
  listPosts(
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
  ): Promise<ListPostsResult> {
    return this.svc.listPosts(Number(limit), cursor);
  }

  @Post('posts')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new post' })
  @ApiCreatedResponse({ type: PostListItemDto })
  createPost(
    @CurrentUser() user: AuthUser,
    @Body() body: CreatePostDto,
  ): Promise<PostListItem> {
    return this.svc.createPost(user.userId, body);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get post detail; increments view count' })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: PostDetailDto })
  getPost(@Param('id') id: string, @CurrentUser() user?: AuthUser): Promise<PostDetail> {
    return this.svc.getPost(id, user?.userId);
  }

  @Post('posts/:id/bookmarks')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Bookmark a post' })
  @ApiOkResponse({ type: BookmarkResponseDto })
  bookmark(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookmarkResponse> {
    return this.svc.bookmark(id, user.userId);
  }

  @Delete('posts/:id/bookmarks')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unbookmark a post' })
  @ApiOkResponse({ type: BookmarkResponseDto })
  unbookmark(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookmarkResponse> {
    return this.svc.unbookmark(id, user.userId);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'List comments with like count and my-like flag' })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: ListCommentsResponseDto })
  listComments(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<ListCommentsResult> {
    return this.svc.listComments(id, user?.userId);
  }

  @Post('posts/:id/comments')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a comment or reply' })
  @ApiCreatedResponse({ type: CommentListItemDto })
  createComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCommentDto,
  ): Promise<CommentListItem> {
    return this.svc.createComment(id, user.userId, body);
  }

  @Delete('comments/:commentId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete own comment (no children allowed)' })
  @ApiOkResponse({ type: DeleteCommentResponseDto })
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DeleteCommentResponse> {
    return this.svc.deleteComment(commentId, user.userId);
  }

  @Post('comments/:commentId/likes')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Like a comment' })
  @ApiOkResponse({ type: LikeCommentResponseDto })
  likeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LikeCommentResponse> {
    return this.svc.likeComment(commentId, user.userId);
  }

  @Delete('comments/:commentId/likes')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiOkResponse({ type: LikeCommentResponseDto })
  unlikeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LikeCommentResponse> {
    return this.svc.unlikeComment(commentId, user.userId);
  }
}
