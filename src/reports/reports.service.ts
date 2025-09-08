import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type Report, ReportTargetType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // 입력 파라미터 명확화(Prisma enum 사용)
  async create(dto: CreateReportInput): Promise<Report> {
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

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  reporterId: string;
}
