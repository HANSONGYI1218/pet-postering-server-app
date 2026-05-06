import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { FosterMatcherAnimalListResult } from 'src/domain/public-foster/application/matcher.types';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/types';
import { FosterMatcherAnimalListResponseDto } from './dto/foster-matcher.dto';
import { FosterMatcherService } from './foster.matcher.service';

@ApiTags('Foster')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('foster/matcher')
export class FosterMatcherController {
  constructor(private readonly fosterMatcherService: FosterMatcherService) {}

  @Get('animals')
  @ApiOperation({ summary: 'List fo ster animals filtered by criteria' })
  @ApiOkResponse({ type: FosterMatcherAnimalListResponseDto })
  listAnimals(@CurrentUser() user: AuthUser): Promise<FosterMatcherAnimalListResult> {
    return this.fosterMatcherService.listMatchedAnimals(user.userId);
  }
}
