import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class ListPostsQueryDto {
  @ApiPropertyOptional({ description: 'Cursor (post id) for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Page size (1-50)',
    minimum: 1,
    maximum: 50,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreatePostDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ description: 'Post content' })
  @IsString()
  @Length(1, 5000)
  content!: string;
}

export class UpdatePostDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({ description: 'Post content' })
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  content?: string;
}

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @Length(1, 2000)
  content!: string;

  @ApiPropertyOptional({ description: 'Parent comment id for reply' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @Length(1, 2000)
  content!: string;
}

// ======== Small Response DTOs ========
export class BookmarkResponseDto {
  @ApiProperty()
  postId!: string;

  @ApiProperty()
  bookmarked!: boolean;
}

export class DeleteCommentResponseDto {
  @ApiProperty()
  commentId!: string;

  @ApiProperty({ enum: [true] })
  deleted!: true;
}

export class LikeCommentResponseDto {
  @ApiProperty()
  commentId!: string;

  @ApiProperty()
  liked!: boolean;
}

export class LikePostResponseDto {
  @ApiProperty()
  postId!: string;

  @ApiProperty()
  liked!: boolean;

  @ApiProperty()
  likeCount!: number;
}

// ======== Community List/Detail/Comments DTOs ========
export class PostCountDto {
  @ApiProperty()
  comments!: number;

  @ApiProperty()
  likes!: number;
}

export class PostAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;
}

export class PostListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty({ type: () => PostAuthorDto })
  author!: PostAuthorDto;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  viewCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ description: 'Number of likes' })
  likeCount!: number;

  @ApiProperty({ type: () => PostCountDto })
  _count!: PostCountDto;
}

export class PostDetailDto extends PostListItemDto {
  @ApiProperty()
  isBookmarked!: boolean;

  @ApiProperty()
  liked!: boolean;
}

export class PostListResponseDto {
  @ApiProperty({ type: () => [PostListItemDto] })
  items!: PostListItemDto[];

  @ApiPropertyOptional({ description: 'Cursor for next page', nullable: true })
  nextCursor?: string | null;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}

export class CommentAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;
}

export class CommentListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  postId!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty({ type: () => CommentAuthorDto })
  author!: CommentAuthorDto;

  @ApiPropertyOptional({ nullable: true })
  parentId?: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  liked!: boolean;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty({ type: () => [CommentListItemDto] })
  replies!: CommentListItemDto[];
}

export class ListCommentsResponseDto {
  @ApiProperty()
  postId!: string;

  @ApiProperty({ type: () => [CommentListItemDto] })
  items!: CommentListItemDto[];
}
