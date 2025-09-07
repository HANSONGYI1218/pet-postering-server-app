import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateCommentDto, CreatePostDto } from './dto/community.dto';
import { OptionalJwtAuthGuard } from '../common/optional-jwt.guard';

@ApiTags('Community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  @Get('posts')
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor (post id) for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Page size (1-50)', example: 20 })
  @ApiOperation({ summary: 'List posts with comment count (cursor pagination)' })
  listPosts(@Query('cursor') cursor?: string, @Query('limit') limit: string = '20') {
    return this.svc.listPosts(Number(limit), cursor);
  }

  @Post('posts')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new post' })
  createPost(@CurrentUser() user: any, @Body() body: CreatePostDto) {
    return this.svc.createPost(user.userId, body);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get post detail; increments view count' })
  @UseGuards(OptionalJwtAuthGuard)
  getPost(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.svc.getPost(id, user?.userId);
  }

  @Post('posts/:id/bookmarks')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Bookmark a post' })
  bookmark(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.bookmark(id, user.userId);
  }

  @Delete('posts/:id/bookmarks')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unbookmark a post' })
  unbookmark(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.unbookmark(id, user.userId);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'List comments with like count and my-like flag' })
  @UseGuards(OptionalJwtAuthGuard)
  listComments(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.svc.listComments(id, user?.userId);
  }

  @Post('posts/:id/comments')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a comment or reply' })
  createComment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: CreateCommentDto,
  ) {
    return this.svc.createComment(id, user.userId, body);
  }

  @Delete('comments/:commentId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete own comment (no children allowed)' })
  deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: any) {
    return this.svc.deleteComment(commentId, user.userId);
  }

  @Post('comments/:commentId/likes')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Like a comment' })
  likeComment(@Param('commentId') commentId: string, @CurrentUser() user: any) {
    return this.svc.likeComment(commentId, user.userId);
  }

  @Delete('comments/:commentId/likes')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unlike a comment' })
  unlikeComment(@Param('commentId') commentId: string, @CurrentUser() user: any) {
    return this.svc.unlikeComment(commentId, user.userId);
  }
}

