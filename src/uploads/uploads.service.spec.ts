import { randomUUID } from 'node:crypto';

import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { UploadsService } from './uploads.service';

jest.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: jest.fn(),
}));

jest.mock('node:crypto', () => {
  const actual = jest.requireActual('node:crypto');
  return {
    ...actual,
    randomUUID: jest.fn(),
  };
});

describe('UploadsService', () => {
  const mockCreatePresignedPost = jest.requireMock('@aws-sdk/s3-presigned-post')
    .createPresignedPost as jest.Mock;
  const mockRandomUUID = randomUUID as unknown as jest.Mock;

  const createConfigService = (overrides: Record<string, string | undefined> = {}) =>
    ({
      get: (key: string) => overrides[key],
    }) as unknown as ConfigService;

  const defaultConfig = {
    UPLOADS_BUCKET: 'furdiz-dev-uploads',
    UPLOADS_REGION: 'ap-northeast-2',
    UPLOADS_CDN_DOMAIN: 'https://cdn.example.com',
    UPLOADS_MAX_SIZE: String(5 * 1024 * 1024),
    UPLOADS_URL_EXPIRES_IN: '120',
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('mock-uuid');
  });

  it('returns presigned upload information for valid image', async () => {
    mockCreatePresignedPost.mockResolvedValueOnce({
      url: 'https://signed-url',
      fields: {
        key: 'animals/mock-uuid.jpg',
        Policy: 'policy',
        'Content-Type': 'image/jpeg',
      },
    });
    const service = new UploadsService(createConfigService(defaultConfig));

    const result = await service.createImageUploadUrl({
      scope: 'animals',
      fileName: 'cute-dog.JPG',
      contentType: 'image/jpeg',
      fileSize: 1024 * 1024,
    });

    expect(mockCreatePresignedPost).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      uploadUrl: 'https://signed-url',
      publicUrl: 'https://cdn.example.com/animals/mock-uuid.jpg',
      key: 'animals/mock-uuid.jpg',
      expiresIn: 120,
      contentType: 'image/jpeg',
      fields: {
        key: 'animals/mock-uuid.jpg',
        Policy: 'policy',
        'Content-Type': 'image/jpeg',
      },
    });
  });

  it('throws when bucket is missing', async () => {
    const service = new UploadsService(createConfigService({}));

    await expect(
      service.createImageUploadUrl({
        scope: 'animals',
        fileName: 'cat.png',
        contentType: 'image/png',
        fileSize: 1,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('rejects oversized files', async () => {
    const service = new UploadsService(createConfigService(defaultConfig));

    await expect(
      service.createImageUploadUrl({
        scope: 'animals',
        fileName: 'large.png',
        contentType: 'image/png',
        fileSize: 10 * 1024 * 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unsupported mime types', async () => {
    const service = new UploadsService(createConfigService(defaultConfig));

    await expect(
      service.createImageUploadUrl({
        scope: 'animals',
        fileName: 'script.js',
        contentType: 'text/javascript',
        fileSize: 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to direct S3 URL when CDN domain is missing', async () => {
    mockCreatePresignedPost.mockResolvedValueOnce({
      url: 'https://signed-url',
      fields: {
        key: 'animals/mock-uuid.png',
        Policy: 'policy',
        'Content-Type': 'image/png',
      },
    });
    const service = new UploadsService(
      createConfigService({
        ...defaultConfig,
        UPLOADS_CDN_DOMAIN: undefined,
      }),
    );

    const result = await service.createImageUploadUrl({
      scope: 'Animals',
      fileName: 'cat.png',
      contentType: 'image/png',
      fileSize: 512,
    });

    expect(result.publicUrl).toBe(
      'https://furdiz-dev-uploads.s3.ap-northeast-2.amazonaws.com/animals/mock-uuid.png',
    );
  });

  it('uses default scope when sanitized scope becomes empty', async () => {
    mockCreatePresignedPost.mockResolvedValueOnce({
      url: 'https://signed-url',
      fields: {
        key: 'uploads/mock-uuid.png',
        Policy: 'policy',
        'Content-Type': 'image/png',
      },
    });
    const service = new UploadsService(createConfigService(defaultConfig));

    const result = await service.createImageUploadUrl({
      scope: '***',
      fileName: 'cat.png',
      contentType: 'image/png',
      fileSize: 512,
    });

    expect(result.key).toMatch(/^uploads\/mock-uuid\.png$/);
  });
});
