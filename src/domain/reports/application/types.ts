import type { ReportTargetType } from '@prisma/client';

export interface CreateReportCommand {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  reporterId: string;
}

export interface ReportCreateData {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  reporterId: string;
}

export interface ReportView {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  reporterId: string;
  createdAt: Date;
  updatedAt: Date;
}
