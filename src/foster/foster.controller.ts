import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FosterService } from './foster.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  AnimalStatusDto,
  CreateAnimalDto,
  CreateRecordDto,
  UpdateAnimalDto,
  UpdateRecordDto,
  GetRecordResponseDto,
  ListRecordsResponseDto,
  DeleteAnimalResponseDto,
} from './dto/foster.dto';
import type { AuthUser } from '../common/types';

@ApiTags('Foster')
@ApiBearerAuth()
@ApiExtraModels(
  GetRecordResponseDto,
  ListRecordsResponseDto,
  DeleteAnimalResponseDto,
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string', enum: Object.values(AnimalStatusDto) },
              shared: { type: 'boolean' },
              orgId: { type: 'string', nullable: true },
              ownerUserId: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              fosterDays: { type: 'number' },
            },
          },
        },
      },
    },
  })
  listAnimals(@Query('status') status?: string) {
    return this.svc.listAnimals(status);
  }

  @Get('shared-animals')
  @ApiOperation({ summary: 'List shared animals' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string', enum: Object.values(AnimalStatusDto) },
              shared: { type: 'boolean' },
              orgId: { type: 'string', nullable: true },
              ownerUserId: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              fosterDays: { type: 'number' },
            },
          },
        },
      },
    },
  })
  listSharedAnimals() {
    return this.svc.listSharedAnimals();
  }

  @Post('animals')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create animal (ORG only for org-owned)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', enum: Object.values(AnimalStatusDto) },
        shared: { type: 'boolean' },
        orgId: { type: 'string', nullable: true },
        ownerUserId: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  createAnimal(@CurrentUser() user: AuthUser, @Body() body: CreateAnimalDto) {
    return this.svc.createAnimal(user, body);
  }

  @Patch('animals/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update animal (owner or ORG admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', enum: Object.values(AnimalStatusDto) },
        shared: { type: 'boolean' },
        orgId: { type: 'string', nullable: true },
        ownerUserId: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  updateAnimal(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateAnimalDto,
  ) {
    return this.svc.updateAnimal(id, user, body);
  }

  @Delete('animals/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete animal (owner or ORG admin)' })
  @ApiOkResponse({ type: DeleteAnimalResponseDto })
  deleteAnimal(@Param('id') id: string, @CurrentUser() user: AuthUser) {
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        animalId: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        content: { type: 'string', nullable: true },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              recordId: { type: 'string' },
              url: { type: 'string' },
              sortOrder: { type: 'number', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  createRecord(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateRecordDto,
  ) {
    return this.svc.createRecord(id, user, body);
  }

  @Patch('animals/:id/records/:recordId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update record and images' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        animalId: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        content: { type: 'string', nullable: true },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              recordId: { type: 'string' },
              url: { type: 'string' },
              sortOrder: { type: 'number', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  updateRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateRecordDto,
  ) {
    return this.svc.updateRecord(id, recordId, user, body);
  }

  @Delete('animals/:id/records/:recordId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete record' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        animalId: { type: 'string' },
        id: { type: 'string' },
        deleted: { type: 'boolean', enum: [true] },
      },
    },
  })
  deleteRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.deleteRecord(id, recordId, user);
  }

  @Get('waiting-animals')
  @ApiOperation({ summary: 'List animals in WAITING status' })
  waitingAnimals() {
    return this.svc.listAnimals('WAITING');
  }
}
