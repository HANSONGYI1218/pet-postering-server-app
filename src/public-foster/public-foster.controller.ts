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
  constructor(private readonly service: PublicFosterService) {}

  @Get('animals')
  @ApiOperation({ summary: '임보 동물 목록 (공개)' })
  @ApiOkResponse({ type: PublicFosterAnimalListResponseDto })
  listAnimals(): Promise<PublicFosterAnimalListResult> {
    return this.service.listAnimals();
  }

  @Get('animals/:id')
  @ApiOperation({ summary: '임보 동물 상세 (공개)' })
  @ApiOkResponse({ type: PublicFosterAnimalDetailDto })
  getAnimal(@Param('id') id: string): Promise<PublicFosterAnimalDetail> {
    return this.service.getAnimal(id);
  }
}
