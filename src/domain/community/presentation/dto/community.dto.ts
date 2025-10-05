import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

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

// ======== Community List/Detail/Comments DTOs ========
export class PostCountDto {
  @ApiProperty()
  comments!: number;
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

  @ApiProperty({ type: () => PostCountDto })
  _count!: PostCountDto;
}

export class PostDetailDto extends PostListItemDto {
  @ApiProperty()
  isBookmarked!: boolean;
}

export class PostListResponseDto {
  @ApiProperty({ type: () => [PostListItemDto] })
  items!: PostListItemDto[];

  @ApiPropertyOptional({ description: 'Cursor for next page', nullable: true })
  nextCursor?: string | null;

  @ApiProperty({ description: 'Page size' })
  limit!: number;
}

export class CommentCountDto {
  @ApiProperty()
  likes!: number;

  @ApiProperty()
  replies!: number;
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

  @ApiPropertyOptional()
  parentId?: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  liked!: boolean;

  @ApiProperty({ type: () => CommentCountDto })
  _count!: CommentCountDto;
}

export class ListCommentsResponseDto {
  @ApiProperty()
  postId!: string;

  @ApiProperty({ type: () => [CommentListItemDto] })
  items!: CommentListItemDto[];
}
