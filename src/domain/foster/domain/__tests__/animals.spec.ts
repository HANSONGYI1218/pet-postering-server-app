import { AnimalStatus } from '@prisma/client';

import { parseAnimalStatus } from '../animals';

describe('parseAnimalStatus', () => {
  it('유효한 상태 문자열을 반환한다', () => {
    expect(parseAnimalStatus('WAITING')).toEqual({
      status: 'ok',
      value: AnimalStatus.WAITING,
    });
  });

  it('값이 없으면 undefined를 반환한다', () => {
    expect(parseAnimalStatus(undefined)).toEqual({
      status: 'ok',
      value: undefined,
    });
  });

  it('잘못된 값이면 error를 반환한다', () => {
    expect(parseAnimalStatus('INVALID')).toEqual({
      status: 'error',
      reason: 'invalid-animal-status',
    });
  });
});
