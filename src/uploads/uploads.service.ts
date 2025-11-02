import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_REGION = 'ap-northeast-2';
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_EXPIRES_IN = 120; // seconds

const IMAGE_MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(IMAGE_MIME_EXTENSION));

export interface CreateImageUploadInput {
  readonly scope: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly fileSize: number;
}

export interface PresignedUpload {
  readonly uploadUrl: string;
  readonly publicUrl: string;
  readonly key: string;
  readonly expiresIn: number;
  readonly contentType: string;
  readonly method: 'POST' | 'PUT';
  readonly fields: Record<string, string>;
  readonly headers: Record<string, string>;
}

interface PreparedInput {
  readonly sanitizedScope: string;
  readonly extension: string;
  readonly contentType: string;
}

@Injectable()
export class UploadsService {
  private readonly bucket: string | undefined;
  private readonly region: string;
  private readonly cdnDomain: string | undefined;
  private readonly maxSize: number;
  private readonly expiresIn: number;
  private readonly s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('UPLOADS_BUCKET');
    this.region = this.configService.get<string>('UPLOADS_REGION') ?? DEFAULT_REGION;
    this.cdnDomain = this.configService.get<string>('UPLOADS_CDN_DOMAIN');
    this.maxSize = this.resolveNumber(
      this.configService.get<string>('UPLOADS_MAX_SIZE'),
      DEFAULT_MAX_SIZE,
    );
    this.expiresIn = this.resolveNumber(
      this.configService.get<string>('UPLOADS_URL_EXPIRES_IN'),
      DEFAULT_EXPIRES_IN,
    );
    this.s3 = new S3Client({ region: this.region });
  }

  async createImageUploadUrl(input: CreateImageUploadInput): Promise<PresignedUpload> {
    if (!this.bucket) {
      throw new InternalServerErrorException('UPLOAD_BUCKET_NOT_CONFIGURED');
    }

    const { sanitizedScope, extension, contentType } = this.prepareInput(input);

    const key = `${sanitizedScope}/${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.expiresIn,
    });

    return {
      uploadUrl,
      publicUrl: this.resolvePublicUrl(key),
      key,
      expiresIn: this.expiresIn,
      contentType,
      method: 'PUT',
      fields: {},
      headers: {
        'Content-Type': contentType,
      },
    };
  }

  private prepareInput(input: CreateImageUploadInput): PreparedInput {
    if (!input.scope || input.scope.trim() === '') {
      throw new BadRequestException('UPLOAD_SCOPE_REQUIRED');
    }

    if (!input.fileName || input.fileName.trim() === '') {
      throw new BadRequestException('UPLOAD_FILENAME_REQUIRED');
    }

    if (Number.isNaN(input.fileSize) || input.fileSize <= 0) {
      throw new BadRequestException('UPLOAD_INVALID_FILE_SIZE');
    }

    if (input.fileSize > this.maxSize) {
      throw new BadRequestException('UPLOAD_FILE_TOO_LARGE');
    }

    const normalizedContentType = input.contentType.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(normalizedContentType)) {
      throw new BadRequestException('UPLOAD_UNSUPPORTED_CONTENT_TYPE');
    }

    const sanitizedScope = input.scope
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9/-]/g, '');

    const inferredExt = this.resolveExtension(input.fileName, normalizedContentType);

    return {
      sanitizedScope: sanitizedScope || 'uploads',
      extension: inferredExt,
      contentType: normalizedContentType,
    };
  }

  private resolveExtension(fileName: string, contentType: string): string {
    const ext = extname(fileName).replace('.', '').toLowerCase();
    if (ext) {
      return ext;
    }
    const fallback = IMAGE_MIME_EXTENSION[contentType];
    if (!fallback) {
      throw new BadRequestException('UPLOAD_INVALID_EXTENSION');
    }
    return fallback;
  }

  private resolvePublicUrl(key: string): string {
    if (this.cdnDomain) {
      return `${this.cdnDomain.replace(/\/+$/, '')}/${key}`;
    }

    const bucket = this.bucket;
    if (!bucket) {
      throw new InternalServerErrorException('UPLOAD_BUCKET_NOT_CONFIGURED');
    }

    return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private resolveNumber(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
}
