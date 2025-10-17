import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/types';
import {
  UpdateUserNotificationSettingDto,
  UpdateUserProfileDto,
  UserCommentItemDto,
  UserNotificationSettingDto,
  UserPostItemDto,
  UserProfileDto,
} from './dto/user.dto';
import { UsersService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '현재 사용자 프로필 조회' })
  @ApiOkResponse({ type: UserProfileDto })
  getProfile(@CurrentUser() user: AuthUser): Promise<UserProfileDto> {
    return this.users.getProfile(user.userId);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: '현재 사용자 알림 설정 조회' })
  @ApiOkResponse({ type: UserNotificationSettingDto })
  getNotificationSetting(
    @CurrentUser() user: AuthUser,
  ): Promise<UserNotificationSettingDto> {
    return this.users.getNotificationSetting(user.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: '현재 사용자 프로필 수정' })
  @ApiOkResponse({ type: UserProfileDto })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserProfileDto,
  ): Promise<UserProfileDto> {
    return this.users.updateProfile(user.userId, body);
  }

  @Patch('notification-settings')
  @ApiOperation({ summary: '현재 사용자 알림 설정 수정' })
  @ApiOkResponse({ type: UserNotificationSettingDto })
  updateNotificationSetting(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserNotificationSettingDto,
  ): Promise<UserNotificationSettingDto> {
    return this.users.updateNotificationSetting(user.userId, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '현재 사용자 계정 삭제' })
  deleteAccount(@CurrentUser() user: AuthUser): Promise<void> {
    return this.users.deleteAccount(user.userId);
  }

  @Get('posts')
  @ApiOperation({ summary: '현재 사용자가 작성한 커뮤니티 게시글 목록' })
  @ApiOkResponse({ type: UserPostItemDto, isArray: true })
  listMyPosts(@CurrentUser() user: AuthUser): Promise<UserPostItemDto[]> {
    return this.users.listMyPosts(user.userId);
  }

  @Get('comments')
  @ApiOperation({ summary: '현재 사용자가 작성한 커뮤니티 댓글 목록' })
  @ApiOkResponse({ type: UserCommentItemDto, isArray: true })
  listMyComments(@CurrentUser() user: AuthUser): Promise<UserCommentItemDto[]> {
    return this.users.listMyComments(user.userId);
  }
}
