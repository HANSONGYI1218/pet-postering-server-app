import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notice, NoticeAttachment } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type NoticeWithAttachments = Notice & { attachments: NoticeAttachment[] };

export interface PublicNoticeListItem {
  id: string;
  title: string;
  type: string | null;
  isFixed: boolean;
  createdAt: string;
  attachments: number;
}

export interface PublicNoticeListResult {
  items: PublicNoticeListItem[];
}

export interface PublicNoticeDetail {
  id: string;
  title: string;
  type: string | null;
  isFixed: boolean;
  createdAt: string;
  content: string;
  attachmentFiles: string[];
}

const toListItem = (notice: NoticeWithAttachments): PublicNoticeListItem => ({
  id: notice.id,
  title: notice.title,
  type: notice.type,
  isFixed: notice.isFixed,
  createdAt: notice.createdAt.toISOString(),
  attachments: notice.attachments.length,
});

const toDetail = (notice: NoticeWithAttachments): PublicNoticeDetail => ({
  id: notice.id,
  title: notice.title,
  type: notice.type,
  isFixed: notice.isFixed,
  createdAt: notice.createdAt.toISOString(),
  content: notice.content,
  attachmentFiles: notice.attachments.map((attachment) => attachment.url),
});

@Injectable()
export class PublicNoticeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PublicNoticeListResult> {
    const notices = await this.prisma.notice.findMany({
      include: { attachments: true },
      orderBy: [{ isFixed: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      items: notices.map(toListItem),
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

    return toDetail(notice);
  }
}
