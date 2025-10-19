import type { ReportView } from './types';

interface ReportRecord {
  id: string;
  targetType: ReportView['targetType'];
  targetId: ReportView['targetId'];
  reason: ReportView['reason'];
  reporterId: ReportView['reporterId'];
  createdAt: ReportView['createdAt'];
  updatedAt: ReportView['updatedAt'];
}

export const toReportView = (report: ReportRecord): ReportView => ({
  id: report.id,
  targetType: report.targetType,
  targetId: report.targetId,
  reason: report.reason,
  reporterId: report.reporterId,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt,
});
