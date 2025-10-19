import { Injectable, NotFoundException } from '@nestjs/common';

import {
  toPublicNoticeDetail,
  toPublicNoticeListItem,
} from '../domain/public-notice/application/mappers';
import type {
  PublicNoticeDetail,
  PublicNoticeListResult,
} from '../domain/public-notice/application/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicNoticeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PublicNoticeListResult> {
    const notices = await this.prisma.notice.findMany({
      include: { attachments: true },
      orderBy: [{ isFixed: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      items: notices.map(toPublicNoticeListItem),
    };
  }

  async get(id: string): Promise<PublicNoticeDetail> {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!notice) {
      throw new NotFoundException('public-notice-not-found');
    }

    return toPublicNoticeDetail(notice);
  }
}
