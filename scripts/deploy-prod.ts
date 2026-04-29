#!/usr/bin/env ts-node

import { spawnSync } from 'node:child_process';

import { fetchLambdaEnv } from './lib/aws-cli';

const REQUIRED_KEYS = [
  'PET_SERVER_PROD_DATABASE_URL',
  'PET_SERVER_PROD_DATABASE_URL',
  'PET_SERVER_PROD_JWT_ACCESS_SECRET',
  'PET_SERVER_PROD_JWT_REFRESH_SECRET',
  'PET_SERVER_PROD_KAKAO_CLIENT_ID',
  'PET_SERVER_PROD_KAKAO_CLIENT_SECRET',
  'PET_SERVER_PROD_KAKAO_REDIRECT_URI',
  'PET_SERVER_PROD_KAKAO_LOGOUT_REDIRECT_URI',
] as const;

interface CliOptions {
  readonly stage: string;
  readonly profile?: string;
  readonly region: string;
  readonly healthUrl?: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  let stage = 'prod';
  let profile: string | undefined;
  let region = 'ap-northeast-2';
  let healthUrl: string | undefined;

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
      case 'stage':
        stage = next;
        break;
      case 'profile':
        profile = next;
        break;
      case 'region':
        region = next;
        break;
      case 'health-url':
        healthUrl = next;
        break;
      default:
        throw new Error(`지원하지 않는 옵션: --${key}`);
    }

    index += 1;
  }

  return { stage, profile, region, healthUrl };
};

const ensureEnv = (): void => {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`환경 변수가 비어 있습니다: ${missing.join(', ')}`);
  }
};

const runCommand = (
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): void => {
  const result = spawnSync(command, [...args], {
    stdio: 'inherit',
    env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 실행이 실패했습니다.`);
  }
};

const waitForHealth = async (url: string): Promise<void> => {
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`헬스 체크 실패 (${response.status.toString()}). body=${body}`);
  }
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const lambdaEnv = fetchLambdaEnv({
    functionName: `pet-server-${options.stage}`,
    profile: options.profile,
    region: options.region,
  });

  Object.entries(lambdaEnv).forEach(([key, value]) => {
    process.env[key] ??= value;
  });

  ensureEnv();

  const childEnv = {
    ...process.env,
    AWS_REGION: options.region,
  } as NodeJS.ProcessEnv;

  if (options.profile) {
    childEnv.AWS_PROFILE = options.profile;
  }

  runCommand('npm', ['run', 'verify:prod'], childEnv);
  runCommand('npm', ['--prefix', 'infra', 'run', 'deploy:prod'], childEnv);

  const healthUrl =
    options.healthUrl ??
    (lambdaEnv.PET_SERVER_PROD_API_DOMAIN
      ? `https://${lambdaEnv.PET_SERVER_PROD_API_DOMAIN}/health`
      : 'https://api.furdiz.com/health');

  await waitForHealth(healthUrl);
  process.stdout.write(`헬스 체크 성공: ${healthUrl}\n`);
};

main().catch((error: unknown) => {
  console.error('배포에 실패했습니다.', error);
  process.exit(1);
});
