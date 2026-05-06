import {
  AnimalAge,
  AnimalEnvironmentTagType,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalType,
  FosterCondition,
} from '@prisma/client';

type AnimalFilteredType = {
  id: string;
  type: AnimalType | null;
  age: Date | null;
  size: AnimalSize | null;
  healthTags: AnimalHealthTagType[];
  personalityTags: AnimalPersonalityTagType[];
  environmentTags: AnimalEnvironmentTagType[];
  specialNoteTags: AnimalSpecialNoteTagType[];
};

const getAnimalAgeCategory = (birthDate: Date): AnimalAge => {
  const now = new Date();

  const ageInMonths =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());

  if (ageInMonths < 12) return 'JUVENILE';
  if (ageInMonths < 84) return 'ADULT';

  return 'SENIOR';
};

const getMatchedCount = <T>(animalTags: T[], userTags: T[]) => {
  return animalTags.filter((tag) => userTags.includes(tag)).length;
};

export async function calculateScore(
  animal: AnimalFilteredType,
  userCondition: FosterCondition,
): Promise<number> {
  let score = 0;

  // ===== 타입 =====
  if (animal.type && userCondition.preferredTypes.includes(animal.type)) {
    score += 30;
  }

  // ===== 크기 =====
  if (animal.size && userCondition.preferredSizes.includes(animal.size)) {
    score += 20;
  }

  // ===== 나이 =====
  const animalAge = animal.age ? getAnimalAgeCategory(animal.age) : null;

  if (animalAge && userCondition.preferredAges.includes(animalAge)) {
    score += 20;
  }

  // 건강 태그
  score += getMatchedCount(animal.healthTags, userCondition.fosterHealthTags) * 5;

  // 성격 태그
  score +=
    getMatchedCount(animal.personalityTags, userCondition.fosterPersonalityTags) * 6;

  // 환경 태그
  score +=
    getMatchedCount(animal.environmentTags, userCondition.fosterEnvironmentsTags) * 5;

  // 특이사항 태그
  score +=
    getMatchedCount(animal.specialNoteTags, userCondition.fosterSpecialNoteTags) * 3;

  return score;
}
