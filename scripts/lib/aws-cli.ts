import { spawnSync } from 'node:child_process';

export interface FetchLambdaEnvOptions {
  readonly functionName: string;
  readonly region: string;
  readonly profile?: string;
}

export const fetchLambdaEnv = ({
  functionName,
  region,
  profile,
}: FetchLambdaEnvOptions): Record<string, string> => {
  const args = [
    'lambda',
    'get-function-configuration',
    '--function-name',
    functionName,
    '--query',
    'Environment.Variables',
    '--output',
    'json',
    '--region',
    region,
  ];

  if (profile) {
    args.push('--profile', profile);
  }

  const result = spawnSync('aws', args, { encoding: 'utf-8' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const rawStderr = typeof result.stderr === 'string' ? result.stderr : '';
    const message = rawStderr.trim();
    throw new Error(message || 'AWS CLI 호출에 실패했습니다.');
  }

  return JSON.parse(result.stdout || '{}') as Record<string, string>;
};
