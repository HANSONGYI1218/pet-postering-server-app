import { describe, expect, it } from '@jest/globals';

import { formatExportLines, serializeEnvFile } from '../lib/aws-env';

describe('formatExportLines', () => {
  it('converts key-value pairs into export statements', () => {
    const lines = formatExportLines({
      FOO: 'bar',
      BAZ: "qux' quux",
    });

    expect(lines).toEqual(["export BAZ='qux'\\'' quux'", "export FOO='bar'"]);
  });
});

describe('serializeEnvFile', () => {
  it('creates dotenv-style content', () => {
    expect(
      serializeEnvFile({
        TOKEN: 'value',
        EMPTY: '',
      }),
    ).toBe('EMPTY=\nTOKEN=value');
  });
});
