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

  it('normalizes inputs before passing them to Prisma', async () => {
    const { service, create } = build();
    const command = {
      targetType: ReportTargetType.POST,
      targetId: '  target-id  ',
      reason: '  inappropriate  ',
      reporterId: 'reporter-id',
    };
    const saved = {
      id: 'report-id',
      targetType: ReportTargetType.POST,
      targetId: 'target-id',
      reason: 'inappropriate',
      reporterId: 'reporter-id',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };
    create.mockResolvedValueOnce(saved);

    await expect(service.create(command)).resolves.toEqual(saved);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        targetType: ReportTargetType.POST,
        targetId: 'target-id',
        reason: 'inappropriate',
        reporterId: 'reporter-id',
      },
    });
  });

  it('throws BadRequestException when reason is empty', async () => {
    const { service } = build();
    const command = {
      targetType: ReportTargetType.POST,
      targetId: 'target-id',
      reason: '   ',
      reporterId: 'reporter-id',
    };

    await expect(service.create(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when target id is empty', async () => {
    const { service } = build();
    const command = {
      targetType: ReportTargetType.POST,
      targetId: '   ',
      reason: 'spam',
      reporterId: 'reporter-id',
    };

    await expect(service.create(command)).rejects.toThrow(BadRequestException);
  });
});
