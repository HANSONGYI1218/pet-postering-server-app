import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/types';
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

  @Post('applications/:id/accept')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Accept foster application (ORG admin)' })
  acceptApplication(
    @CurrentUser() user: AuthUser,
    @Param('id') applicationId: string,
  ): Promise<void> {
    return this.organizationService.acceptApplication(user, applicationId);
  }
}
