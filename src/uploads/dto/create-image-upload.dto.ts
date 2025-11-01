import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, Matches } from 'class-validator';

const SCOPE_PATTERN = /^[a-zA-Z0-9/-]+$/;

export class CreateImageUploadDto {
  @ApiProperty({
    description: '업로드를 구분하기 위한 경로 (예: animals, community/posts)',
    example: 'animals',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(SCOPE_PATTERN, { message: '영문, 숫자, /, - 만 사용할 수 있습니다.' })
  scope!: string;

  @ApiProperty({
    description: '원본 파일 이름',
    example: 'dog.png',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: '파일 MIME 타입',
    example: 'image/png',
  })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiProperty({
    description: '파일 크기 (Byte)',
    example: 1024,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  fileSize!: number;
}
