import { BadRequestException, Injectable } from '@nestjs/common';

import { toReportView } from '../domain/reports/application/mappers';
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
    const created = await this.prisma.report.create({ data: prepared.data });
    return toReportView(created);
  }
}
