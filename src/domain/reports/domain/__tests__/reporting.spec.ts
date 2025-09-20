import { ReportTargetType } from '@prisma/client';

import { prepareReportCreation } from '../reporting';

describe('reports domain', () => {
  const baseCommand = {
    targetType: ReportTargetType.COMMUNITY,
    targetId: 'post-123',
    reason: 'inappropriate content',
    reporterId: 'user-777',
  } as const;

  it('불필요한 공백을 제거하고 Prisma 입력을 돌려준다', () => {
    const result = prepareReportCreation({
      ...baseCommand,
      targetId: '  post-123  ',
      reason: '  spam content  ',
    });

    expect(result).toEqual({
      status: 'ok',
      data: {
        targetType: ReportTargetType.COMMUNITY,
        targetId: 'post-123',
        reason: 'spam content',
        reporterId: 'user-777',
      },
    });
  });

  it('사유가 공백뿐이면 에러를 반환한다', () => {
    const result = prepareReportCreation({
      ...baseCommand,
      reason: '   ',
    });

    expect(result).toEqual({ status: 'error', reason: 'report-reason-empty' });
  });

  it('대상 id가 공백뿐이면 에러를 반환한다', () => {
    const result = prepareReportCreation({
      ...baseCommand,
      targetId: '\n\t   ',
    });

    expect(result).toEqual({ status: 'error', reason: 'report-target-empty' });
  });
});
