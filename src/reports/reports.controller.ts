import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReportDto } from './dto/reports.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Report a post or comment' })
  create(
    @CurrentUser() user: any,
    @Body() body: CreateReportDto,
  ) {
    return this.svc.create({ ...body, reporterId: user.userId });
  }
}

