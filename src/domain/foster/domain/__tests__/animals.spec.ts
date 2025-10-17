import { AnimalStatus } from '@prisma/client';

import { parseAnimalStatus } from '../animals';

describe('parseAnimalStatus', () => {
  it('returns a valid status value when input is correct', () => {
    expect(parseAnimalStatus('WAITING')).toEqual({
      status: 'ok',
      value: AnimalStatus.WAITING,
    });
  });

  it('returns undefined when value is missing', () => {
    expect(parseAnimalStatus(undefined)).toEqual({
      status: 'ok',
      value: undefined,
    });
  });

  it('returns an error when value is invalid', () => {
    expect(parseAnimalStatus('INVALID')).toEqual({
      status: 'error',
      reason: 'invalid-animal-status',
    });
  });
});
