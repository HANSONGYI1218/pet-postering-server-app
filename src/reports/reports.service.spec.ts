import { BadRequestException } from '@nestjs/common';
import { ReportTargetType } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const build = () => {
    const create = jest.fn();
    const prisma = {
      report: { create },
    } as unknown as PrismaService;
    const service = new ReportsService(prisma);
    return { service, create };
  };

  it('입력을 정규화해 Prisma에 전달한다', async () => {
    const { service, create } = build();
    const command = {
      targetType: ReportTargetType.COMMUNITY,
      targetId: '  target-id  ',
      reason: '  inappropriate  ',
      reporterId: 'reporter-id',
    };
    const saved = {
      id: 'report-id',
      targetType: ReportTargetType.COMMUNITY,
      targetId: 'target-id',
      reason: 'inappropriate',
      reporterId: 'reporter-id',
    };
    create.mockResolvedValueOnce(saved);

    await expect(service.create(command)).resolves.toBe(saved);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        targetType: ReportTargetType.COMMUNITY,
        targetId: 'target-id',
        reason: 'inappropriate',
        reporterId: 'reporter-id',
      },
    });
  });

  it('사유가 비어 있으면 BadRequestException을 던진다', async () => {
    const { service } = build();
    const command = {
      targetType: ReportTargetType.COMMUNITY,
      targetId: 'target-id',
      reason: '   ',
      reporterId: 'reporter-id',
    };

    await expect(service.create(command)).rejects.toThrow(BadRequestException);
  });

  it('대상 id가 비어 있으면 BadRequestException을 던진다', async () => {
    const { service } = build();
    const command = {
      targetType: ReportTargetType.COMMUNITY,
      targetId: '   ',
      reason: 'spam',
      reporterId: 'reporter-id',
    };

    await expect(service.create(command)).rejects.toThrow(BadRequestException);
  });
});
