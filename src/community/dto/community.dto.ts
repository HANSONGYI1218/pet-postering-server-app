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

