import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  PublicFosterAnimalDetail,
  PublicFosterAnimalListResult,
} from '../domain/public-foster/application/types';
import {
  PublicFosterAnimalDetailDto,
  PublicFosterAnimalListResponseDto,
} from './dto/public-foster.dto';
import { PublicFosterService } from './public-foster.service';

@ApiTags('Public Foster')
@Controller('public/foster')
export class PublicFosterController {
  constructor(private readonly publicFosterService: PublicFosterService) {}

  @Get('animals')
  @ApiOperation({ summary: 'List foster animals (public)' })
  @ApiOkResponse({ type: PublicFosterAnimalListResponseDto })
  listAnimals(): Promise<PublicFosterAnimalListResult> {
    return this.publicFosterService.listAnimals();
  }

  @Get('animals/:id')
  @ApiOperation({ summary: 'Get foster animal detail (public)' })
  @ApiOkResponse({ type: PublicFosterAnimalDetailDto })
  getAnimal(@Param('id') id: string): Promise<PublicFosterAnimalDetail> {
    return this.publicFosterService.getAnimal(id);
  }
}
