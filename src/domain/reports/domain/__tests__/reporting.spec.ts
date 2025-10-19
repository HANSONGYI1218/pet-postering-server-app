import { describe, expect, it } from '@jest/globals';
import { ReportTargetType } from '@prisma/client';

import { prepareReportCreation } from '../reporting';

describe('reports domain', () => {
  const baseCommand = {
    targetType: ReportTargetType.POST,
    targetId: 'post-123',
    reason: 'inappropriate content',
    reporterId: 'user-777',
  } as const;

  it('trims unnecessary whitespace before returning Prisma input', () => {
    const result = prepareReportCreation({
      ...baseCommand,
      targetId: '  post-123  ',
      reason: '  spam content  ',
    });

    expect(result).toEqual({
      status: 'ok',
      data: {
        targetType: ReportTargetType.POST,
        targetId: 'post-123',
        reason: 'spam content',
        reporterId: 'user-777',
      },
    });
  });

  it('returns an error when the reason is only whitespace', () => {
    const result = prepareReportCreation({
      ...baseCommand,
      reason: '   ',
    });

    expect(result).toEqual({ status: 'error', reason: 'report-reason-empty' });
  });

  it('returns an error when the target id is only whitespace', () => {
    const result = prepareReportCreation({
      ...baseCommand,
      targetId: '\n\t   ',
    });

    expect(result).toEqual({ status: 'error', reason: 'report-target-empty' });
  });
});
