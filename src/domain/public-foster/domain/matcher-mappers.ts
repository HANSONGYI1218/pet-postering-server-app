import { FosterMatcherAnimalListItem } from '../application/matcher.types';
import { RawAnimal, toPublicFosterListItem } from './mappers';

type ScoredAnimal = {
  animal: RawAnimal;
  fosterDays: number;
  matcherScore: number;
};

export const toFosterMatcherListItem = ({
  animal,
  fosterDays,
  matcherScore,
}: ScoredAnimal): FosterMatcherAnimalListItem => ({
  ...toPublicFosterListItem(animal, fosterDays),
  matcherScore: matcherScore,
});
