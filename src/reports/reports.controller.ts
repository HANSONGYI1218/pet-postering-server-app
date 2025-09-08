import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateReportDto, ReportDto } from './dto/reports.dto';
import type { AuthUser } from '../common/types';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Report a post or comment' })
  @ApiOkResponse({ type: ReportDto })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateReportDto) {
    return this.svc.create({ ...body, reporterId: user.userId });
  }
}
