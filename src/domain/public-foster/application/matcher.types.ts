import { PublicFosterAnimalListItem } from 'src/domain/public-foster/application/types';

export interface FosterMatcherAnimalListItem extends PublicFosterAnimalListItem {
  matcherScore: number;
}

export interface FosterMatcherAnimalListResult {
  items: FosterMatcherAnimalListItem[];
}
