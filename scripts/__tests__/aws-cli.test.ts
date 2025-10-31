import type { SpawnSyncReturns } from 'node:child_process';
import { spawnSync } from 'node:child_process';

import { describe, expect, it, jest } from '@jest/globals';

import { fetchLambdaEnv } from '../lib/aws-cli';

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

describe('fetchLambdaEnv', () => {
  it('calls aws cli with expected arguments', () => {
    (spawnSync as jest.MockedFunction<typeof spawnSync>).mockReturnValue({
      status: 0,
      stdout: '{"FOO":"bar"}',
      stderr: '',
    } as SpawnSyncReturns<string>);

    const result = fetchLambdaEnv({
      functionName: 'pet-server-prod',
      region: 'ap-northeast-2',
      profile: 'test',
    });

    expect(result).toEqual({ FOO: 'bar' });
    expect(spawnSync).toHaveBeenCalledWith(
      'aws',
      [
        'lambda',
        'get-function-configuration',
        '--function-name',
        'pet-server-prod',
        '--query',
        'Environment.Variables',
        '--output',
        'json',
        '--region',
        'ap-northeast-2',
        '--profile',
        'test',
      ],
      { encoding: 'utf-8' },
    );
  });
});
