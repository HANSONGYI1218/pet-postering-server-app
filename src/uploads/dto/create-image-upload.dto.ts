import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, Matches } from 'class-validator';

const SCOPE_PATTERN = /^[a-zA-Z0-9/-]+$/;

export class CreateImageUploadDto {
  @ApiProperty({
    description: 'Scope to categorize uploads (e.g., animals, community/posts)',
    example: 'animals',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(SCOPE_PATTERN, {
    message: 'Only alphanumeric characters, forward slash, and hyphen are allowed.',
  })
  scope!: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'dog.png',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'image/png',
  })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiProperty({
    description: 'File size (bytes)',
    example: 1024,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  fileSize!: number;
}
