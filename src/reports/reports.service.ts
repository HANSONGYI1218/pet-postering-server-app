import { BadRequestException, Injectable } from '@nestjs/common';

import type {
  CreateReportCommand,
  ReportView,
} from '../domain/reports/application/types';
import { prepareReportCreation } from '../domain/reports/domain/reporting';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(command: CreateReportCommand): Promise<ReportView> {
    const prepared = prepareReportCreation(command);
    if (prepared.status === 'error') {
      throw new BadRequestException(prepared.reason);
    }
    return this.prisma.report.create({ data: prepared.data });
  }
}
