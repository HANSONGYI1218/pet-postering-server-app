import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import type {
  UpdateUserNotificationSettingInput,
  UpdateUserProfileInput,
} from '../../domain/user/application/types';

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ nullable: true })
  zipcode!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  addressDetail!: string | null;

  @ApiProperty({ nullable: true })
  introduction!: string | null;

  @ApiProperty()
  isEligibleForFoster!: boolean;
}

export class UpdateUserProfileDto implements UpdateUserProfileInput {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  zipcode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  addressDetail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  introduction?: string | null;
}

export class UserNotificationSettingDto {
  @ApiProperty()
  commentEmail!: boolean;

  @ApiProperty()
  fosterAnimalInfoEmail!: boolean;

  @ApiProperty()
  fosterAnimalInfoKakao!: boolean;

  @ApiProperty()
  marketingEmail!: boolean;

  @ApiProperty()
  marketingKakao!: boolean;
}

export class UpdateUserNotificationSettingDto
  implements UpdateUserNotificationSettingInput
{
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commentEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fosterAnimalInfoEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fosterAnimalInfoKakao?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingKakao?: boolean;
}

export class UserPostItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  views!: number;

  @ApiProperty()
  commentCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class UserCommentPostSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

export class UserCommentItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  postId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  likes!: number;

  @ApiProperty({ type: () => UserCommentPostSummaryDto, nullable: true })
  post!: UserCommentPostSummaryDto | null;
}
