import type { Report, ReportTargetType } from '@prisma/client';

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

export type ReportView = Report;
