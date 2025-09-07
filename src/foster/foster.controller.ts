import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { FosterService } from './foster.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  AnimalStatusDto,
  CreateAnimalDto,
  CreateRecordDto,
  UpdateAnimalDto,
  UpdateRecordDto,
  GetRecordResponseDto,
  ListRecordsResponseDto,
} from './dto/foster.dto';

@ApiTags('Foster')
@ApiBearerAuth()
@Controller('foster')
export class FosterController {
  constructor(private readonly svc: FosterService) {}
  @Get('animals')
  @ApiQuery({ name: 'status', required: false, enum: AnimalStatusDto, description: 'Filter by animal status' })
  @ApiOperation({ summary: 'List animals by status' })
  listAnimals(@Query('status') status?: string) {
    return this.svc.listAnimals(status);
  }

  @Get('shared-animals')
  @ApiOperation({ summary: 'List shared animals' })
  listSharedAnimals() {
    return this.svc.listSharedAnimals();
  }

  @Post('animals')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create animal (ORG only for org-owned)' })
  createAnimal(@CurrentUser() user: any, @Body() body: CreateAnimalDto) {
    return this.svc.createAnimal(user, body);
  }

  @Patch('animals/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update animal (owner or ORG admin)' })
  updateAnimal(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdateAnimalDto,
  ) {
    return this.svc.updateAnimal(id, user, body);
  }

  @Delete('animals/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete animal (owner or ORG admin)' })
  deleteAnimal(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteAnimal(id, user);
  }

  @Get('animals/:id/records')
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO). Defaults to 6 months before today.' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO). Defaults to 6 months after today.' })
  @ApiOperation({ summary: 'List records within a 12-month window' })
  @ApiOkResponse({ type: ListRecordsResponseDto })
  listRecords(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listRecords(id, from, to);
  }

  @Get('animals/:id/records/:recordId')
  @ApiOperation({ summary: 'Get record detail' })
  @ApiOkResponse({ type: GetRecordResponseDto })
  getRecord(@Param('id') id: string, @Param('recordId') recordId: string) {
    return this.svc.getRecord(id, recordId);
  }

  @Post('animals/:id/records')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create record (max 6 images)' })
  createRecord(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: CreateRecordDto,
  ) {
    return this.svc.createRecord(id, user, body);
  }

  @Patch('animals/:id/records/:recordId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update record and images' })
  updateRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @CurrentUser() user: any,
    @Body() body: UpdateRecordDto,
  ) {
    return this.svc.updateRecord(id, recordId, user, body);
  }

  @Delete('animals/:id/records/:recordId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete record' })
  deleteRecord(@Param('id') id: string, @Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.svc.deleteRecord(id, recordId, user);
  }

  @Get('waiting-animals')
  @ApiOperation({ summary: 'List animals in WAITING status' })
  waitingAnimals() {
    return this.svc.listAnimals('WAITING');
  }
}

