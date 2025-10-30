import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  OrganizationAnimalDetail,
  OrganizationAnimalListResult,
} from '../domain/organization/application/types';
import {
  OrganizationAnimalDetailDto,
  OrganizationAnimalListResponseDto,
} from './dto/organization.dto';
import { OrganizationService } from './organization.service';

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('animals')
  @ApiOperation({ summary: 'List animals managed by organization' })
  @ApiOkResponse({ type: OrganizationAnimalListResponseDto })
  listAnimals(): Promise<OrganizationAnimalListResult> {
    return this.organizationService.listAnimals();
  }

  @Get('animals/:id')
  @ApiOperation({ summary: 'Get organization animal detail' })
  @ApiOkResponse({ type: OrganizationAnimalDetailDto })
  getAnimal(@Param('id') id: string): Promise<OrganizationAnimalDetail> {
    return this.organizationService.getAnimal(id);
  }
}
