import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { targetType: 'POST' | 'COMMENT'; targetId: string; reason: string; reporterId: string }) {
    return this.prisma.report.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        reporterId: dto.reporterId,
      },
    });
  }
}

