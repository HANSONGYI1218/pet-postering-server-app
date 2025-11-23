import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/types';
import {
  FosterConditionResponseDto,
  UpsertFosterConditionDto,
} from './dto/foster-condition.dto';
import {
  UpdateUserNotificationSettingDto,
  UpdateUserProfileDto,
  UserCommentItemDto,
  UserNotificationSettingDto,
  UserPostItemDto,
  UserProfileDto,
} from './dto/user.dto';
import { FosterConditionService } from './foster-condition.service';
import { UsersService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users/me')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly fosterConditionService: FosterConditionService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserProfileDto })
  getProfile(@CurrentUser() user: AuthUser): Promise<UserProfileDto> {
    return this.usersService.getProfile(user.userId);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Get current user notification settings' })
  @ApiOkResponse({ type: UserNotificationSettingDto })
  getNotificationSetting(
    @CurrentUser() user: AuthUser,
  ): Promise<UserNotificationSettingDto> {
    return this.usersService.getNotificationSetting(user.userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ type: UserProfileDto })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(user.userId, body);
  }

  @Patch('notification-settings')
  @ApiOperation({ summary: 'Update current user notification settings' })
  @ApiOkResponse({ type: UserNotificationSettingDto })
  updateNotificationSetting(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserNotificationSettingDto,
  ): Promise<UserNotificationSettingDto> {
    return this.usersService.updateNotificationSetting(user.userId, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete current user account' })
  deleteAccount(@CurrentUser() user: AuthUser): Promise<void> {
    return this.usersService.deleteAccount(user.userId);
  }

  @Get('posts')
  @ApiOperation({ summary: 'List community posts authored by current user' })
  @ApiOkResponse({ type: UserPostItemDto, isArray: true })
  listMyPosts(@CurrentUser() user: AuthUser): Promise<UserPostItemDto[]> {
    return this.usersService.listMyPosts(user.userId);
  }

  @Get('comments')
  @ApiOperation({ summary: 'List community comments authored by current user' })
  @ApiOkResponse({ type: UserCommentItemDto, isArray: true })
  listMyComments(@CurrentUser() user: AuthUser): Promise<UserCommentItemDto[]> {
    return this.usersService.listMyComments(user.userId);
  }

  @Get('foster-condition')
  @ApiOperation({ summary: 'Get current user foster condition & experiences' })
  @ApiOkResponse({ type: FosterConditionResponseDto, nullable: true })
  getFosterCondition(
    @CurrentUser() user: AuthUser,
  ): Promise<FosterConditionResponseDto | null> {
    return this.fosterConditionService.getMyCondition(user.userId);
  }

  @Put('foster-condition')
  @ApiOperation({ summary: 'Upsert foster condition for current user' })
  @ApiOkResponse({ type: FosterConditionResponseDto })
  upsertFosterCondition(
    @CurrentUser() user: AuthUser,
    @Body() body: UpsertFosterConditionDto,
  ): Promise<FosterConditionResponseDto | null> {
    return this.fosterConditionService.upsertMyCondition(user.userId, body);
  }

  @Delete('foster-condition')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete foster condition for current user' })
  deleteFosterCondition(@CurrentUser() user: AuthUser): Promise<void> {
    return this.fosterConditionService.deleteMyCondition(user.userId);
  }
}
