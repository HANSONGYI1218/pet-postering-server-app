import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/types';
import type {
  AnimalListItem,
  DeleteAnimalResult,
  DeleteRecordResult,
  FosterRecordBase,
  FosterRecordDetail,
  ListAnimalsResult,
  ListRecordsResult,
} from '../domain/foster/application/types';
import {
  AnimalListItemDto,
  AnimalStatusDto,
  CreateAnimalDto,
  CreateRecordDto,
  DeleteAnimalResponseDto,
  DeleteRecordResponseDto,
  FosterRecordDtoOut,
  GetRecordResponseDto,
  ListAnimalsResponseDto,
  ListRecordsResponseDto,
  UpdateAnimalDto,
  UpdateRecordDto,
} from '../domain/foster/presentation/dto/foster.dto';
import { FosterService } from './foster.service';

@ApiTags('Foster')
@ApiBearerAuth()
@ApiExtraModels(
  AnimalListItemDto,
  ListAnimalsResponseDto,
  GetRecordResponseDto,
  ListRecordsResponseDto,
  DeleteAnimalResponseDto,
  DeleteRecordResponseDto,
)
@Controller('foster')
export class FosterController {
  constructor(private readonly svc: FosterService) {}

  @Get('animals')
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AnimalStatusDto,
    description: 'Filter by animal status',
  })
  @ApiOperation({ summary: 'List animals by status' })
  @ApiOkResponse({ type: ListAnimalsResponseDto })
  listAnimals(@Query('status') status?: string): Promise<ListAnimalsResult> {
    return this.svc.listAnimals(status);
  }

  @Get('shared-animals')
  @ApiOperation({ summary: 'List shared animals' })
  @ApiOkResponse({ type: ListAnimalsResponseDto })
  listSharedAnimals(): Promise<ListAnimalsResult> {
    return this.svc.listSharedAnimals();
  }

  @Post('animals')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create animal (ORG only for org-owned)' })
  @ApiCreatedResponse({ type: AnimalListItemDto })
  createAnimal(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAnimalDto,
  ): Promise<AnimalListItem> {
    return this.svc.createAnimal(user, body);
  }

  @Patch('animals/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update animal (owner or ORG admin)' })
  @ApiOkResponse({ type: AnimalListItemDto })
  updateAnimal(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateAnimalDto,
  ): Promise<AnimalListItem> {
    return this.svc.updateAnimal(id, user, body);
  }

  @Delete('animals/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete animal (owner or ORG admin)' })
  @ApiOkResponse({ type: DeleteAnimalResponseDto })
  deleteAnimal(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DeleteAnimalResult> {
    return this.svc.deleteAnimal(id, user);
  }

  @Get('animals/:id/records')
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO). Defaults to 6 months before today.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (ISO). Defaults to 6 months after today.',
  })
  @ApiOperation({ summary: 'List records within a 12-month window' })
  @ApiOkResponse({ type: ListRecordsResponseDto })
  listRecords(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ListRecordsResult> {
    return this.svc.listRecords(id, from, to);
  }

  @Get('animals/:id/records/:recordId')
  @ApiOperation({ summary: 'Get record detail' })
  @ApiOkResponse({ type: GetRecordResponseDto })
  getRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
  ): Promise<FosterRecordDetail> {
    return this.svc.getRecord(id, recordId);
  }

  @Post('animals/:id/records')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create record (max 6 images)' })
  @ApiCreatedResponse({ type: FosterRecordDtoOut })
  createRecord(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateRecordDto,
  ): Promise<FosterRecordBase> {
    return this.svc.createRecord(id, user, body);
  }

  @Patch('animals/:id/records/:recordId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update record and images' })
  @ApiOkResponse({ type: FosterRecordDtoOut })
  updateRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateRecordDto,
  ): Promise<FosterRecordBase> {
    return this.svc.updateRecord(id, recordId, user, body);
  }

  @Delete('animals/:id/records/:recordId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete record' })
  @ApiOkResponse({ type: DeleteRecordResponseDto })
  deleteRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DeleteRecordResult> {
    return this.svc.deleteRecord(id, recordId, user);
  }

  @Get('waiting-animals')
  @ApiOperation({ summary: 'List animals in WAITING status' })
  @ApiOkResponse({ type: ListAnimalsResponseDto })
  waitingAnimals(): Promise<ListAnimalsResult> {
    return this.svc.listAnimals('WAITING');
  }
}
