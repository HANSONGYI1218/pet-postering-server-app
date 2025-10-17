import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/types';
import type {
  CreateReportCommand,
  ReportView,
} from '../domain/reports/application/types';
import {
  CreateReportDto,
  ReportDto,
} from '../domain/reports/presentation/dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Report a post or comment' })
  @ApiOkResponse({ type: ReportDto })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateReportDto,
  ): Promise<ReportView> {
    const command: CreateReportCommand = {
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      reporterId: user.userId,
    };
    return this.svc.create(command);
  }
}
