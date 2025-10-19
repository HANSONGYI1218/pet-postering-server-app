export interface PublicNoticeListItem {
  id: string;
  title: string;
  type: string | null;
  isFixed: boolean;
  createdAt: Date;
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
  createdAt: Date;
  content: string;
  attachmentFiles: string[];
}
