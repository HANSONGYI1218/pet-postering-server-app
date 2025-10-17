import type { CreateReportCommand, ReportCreateData } from '../application/types';

export type PrepareReportCreationResult =
  | { status: 'ok'; data: ReportCreateData }
  | {
      status: 'error';
      reason: 'report-target-empty' | 'report-reason-empty';
    };

const normalize = (value: string): string => value.trim();

export const prepareReportCreation = (
  command: CreateReportCommand,
): PrepareReportCreationResult => {
  const targetId = normalize(command.targetId);
  if (!targetId) return { status: 'error', reason: 'report-target-empty' };

  const reason = normalize(command.reason);
  if (!reason) return { status: 'error', reason: 'report-reason-empty' };

  return {
    status: 'ok',
    data: {
      targetType: command.targetType,
      targetId,
      reason,
      reporterId: command.reporterId,
    },
  };
};
