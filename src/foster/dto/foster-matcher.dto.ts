import { ApiProperty } from '@nestjs/swagger';

import {
  AnimalAge,
  AnimalEnvironmentTagType,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalType,
} from '@prisma/client';

import { PublicFosterAnimalBaseDto } from 'src/public-foster/dto/public-foster.dto';

export class UserFosterConditionBaseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ isArray: true, enum: AnimalType })
  preferredTypes!: AnimalType[];

  @ApiProperty({ isArray: true, enum: AnimalSize })
  preferredSizes!: AnimalSize[];

  @ApiProperty({ isArray: true, enum: AnimalAge })
  preferredAges!: AnimalAge[];

  @ApiProperty({ isArray: true, enum: AnimalHealthTagType })
  fosterHealthTags!: AnimalHealthTagType[];

  @ApiProperty({ isArray: true, enum: AnimalEnvironmentTagType })
  fosterEnvironmentTags!: AnimalEnvironmentTagType[];

  @ApiProperty({ isArray: true, enum: AnimalSpecialNoteTagType })
  fosterSpecialNoteTags?: AnimalSpecialNoteTagType[];

  @ApiProperty({ isArray: true, enum: AnimalPersonalityTagType })
  fosterPersonalityTags?: AnimalPersonalityTagType[];
}

export class FosterMatcherAnimalListItemDto extends PublicFosterAnimalBaseDto {
  @ApiProperty()
  matcherScore!: number;
}

export class FosterMatcherAnimalListResponseDto {
  @ApiProperty({ type: () => [FosterMatcherAnimalListItemDto] })
  items!: FosterMatcherAnimalListItemDto[];
}
