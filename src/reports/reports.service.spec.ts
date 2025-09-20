import { ReportTargetType } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService', () => {
  const build = () => {
    const create = jest.fn();
    const prisma = {
      report: { create },
    } as unknown as PrismaService;
    const service = new ReportsService(prisma);
    return { service, create };
  };

  it('신고 생성 시 Prisma에 전달한 값을 그대로 돌려준다', async () => {
    const { service, create } = build();
    const dto = {
      targetType: ReportTargetType.COMMUNITY,
      targetId: 'target-id',
      reason: 'inappropriate',
      reporterId: 'reporter-id',
    };
    const saved = { id: 'report-id', ...dto }; // Prisma 반환값 흉내
    create.mockResolvedValueOnce(saved);

    await expect(service.create(dto)).resolves.toBe(saved);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        reporterId: dto.reporterId,
      },
    });
  });
});
