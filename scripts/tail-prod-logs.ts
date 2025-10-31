#!/usr/bin/env ts-node

import { spawn } from 'node:child_process';

const parseArgs = (
  argv: readonly string[],
): { profile?: string; region: string; since: string } => {
  const options: { profile?: string; region: string; since: string } = {
    region: 'ap-northeast-2',
    since: '10m',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      throw new Error(`알 수 없는 인자: ${token}`);
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      throw new Error(`--${key} 옵션에는 값이 필요합니다.`);
    }

    switch (key) {
      case 'profile':
        options.profile = next;
        break;
      case 'region':
        options.region = next;
        break;
      case 'since':
        options.since = next;
        break;
      default:
        throw new Error(`지원하지 않는 옵션: --${key}`);
    }

    index += 1;
  }

  return options;
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));
  const args = [
    'logs',
    'tail',
    '/aws/lambda/pet-server-prod',
    '--follow',
    '--since',
    options.since,
    '--region',
    options.region,
  ];

  if (options.profile) {
    args.push('--profile', options.profile);
  }

  const child = spawn('aws', args, { stdio: 'inherit' });

  child.on('exit', (code) => {
    if (typeof code === 'number' && code !== 0) {
      console.error(`aws logs tail 명령이 실패했습니다. (exit: ${code.toString()})`);
      process.exit(code);
    }
  });
};

try {
  main();
} catch (error: unknown) {
  console.error('로그 스트리밍 시작에 실패했습니다.', error);
  process.exit(1);
}
