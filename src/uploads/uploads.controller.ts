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
  @ApiOperation({ summary: 'Generate S3 presigned URL for image uploads' })
  @ApiCreatedResponse({
    description: 'Returns the upload URL and the public URL.',
    schema: {
      properties: {
        uploadUrl: { type: 'string' },
        publicUrl: { type: 'string' },
        key: { type: 'string' },
        expiresIn: { type: 'number' },
        contentType: { type: 'string' },
        method: { type: 'string', enum: ['POST', 'PUT'] },
        fields: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        headers: {
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
