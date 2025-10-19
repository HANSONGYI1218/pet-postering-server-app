import type { Notice, NoticeAttachment } from '@prisma/client';

import type { PublicNoticeDetail, PublicNoticeListItem } from './types';

type NoticeWithAttachments = Notice & { attachments: NoticeAttachment[] };

export const toPublicNoticeListItem = (
  notice: NoticeWithAttachments,
): PublicNoticeListItem => ({
  id: notice.id,
  title: notice.title,
  type: notice.type,
  isFixed: notice.isFixed,
  createdAt: notice.createdAt,
  attachments: notice.attachments.length,
});

export const toPublicNoticeDetail = (
  notice: NoticeWithAttachments,
): PublicNoticeDetail => ({
  id: notice.id,
  title: notice.title,
  type: notice.type,
  isFixed: notice.isFixed,
  createdAt: notice.createdAt,
  content: notice.content,
  attachmentFiles: notice.attachments.map((attachment) => attachment.url),
});
