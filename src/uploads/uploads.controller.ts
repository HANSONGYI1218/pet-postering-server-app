import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateImageUploadDto } from './dto/create-image-upload.dto';
import { type PresignedUpload, UploadsService } from './uploads.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @ApiOperation({ summary: '이미지 업로드용 S3 presigned URL 생성' })
  @ApiCreatedResponse({
    description: '업로드 URL과 공개 URL을 반환합니다.',
    schema: {
      properties: {
        uploadUrl: { type: 'string' },
        publicUrl: { type: 'string' },
        key: { type: 'string' },
        expiresIn: { type: 'number' },
        contentType: { type: 'string' },
        fields: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  })
  createImageUpload(@Body() dto: CreateImageUploadDto): Promise<PresignedUpload> {
    return this.uploadsService.createImageUploadUrl(dto);
  }
}
