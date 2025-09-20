import { AnimalStatus } from '@prisma/client';

export type ParseAnimalStatusResult =
  | { status: 'ok'; value: AnimalStatus | undefined }
  | { status: 'error'; reason: 'invalid-animal-status' };

export const parseAnimalStatus = (
  rawStatus?: string,
): ParseAnimalStatusResult => {
  if (!rawStatus) return { status: 'ok', value: undefined };
  if ((Object.values(AnimalStatus) as string[]).includes(rawStatus)) {
    return { status: 'ok', value: rawStatus as AnimalStatus };
  }
  return { status: 'error', reason: 'invalid-animal-status' };
};
