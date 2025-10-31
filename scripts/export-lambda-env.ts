#!/usr/bin/env ts-node

import { writeFileSync } from 'node:fs';

import { fetchLambdaEnv } from './lib/aws-cli';
import { formatExportLines, serializeEnvFile } from './lib/aws-env';

interface CliOptions {
  readonly stage: string;
  readonly profile?: string;
  readonly region: string;
  readonly format: 'export' | 'env' | 'json';
  readonly out?: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  let stage = 'prod';
  let profile: string | undefined;
  let region = 'ap-northeast-2';
  let format: CliOptions['format'] = 'export';
  let out: string | undefined;

  const handlers: Partial<Record<string, (value: string) => void>> = {
    stage: (value) => {
      stage = value;
    },
    profile: (value) => {
      profile = value;
    },
    region: (value) => {
      region = value;
    },
    format: (value) => {
      if (value !== 'export' && value !== 'env' && value !== 'json') {
        throw new Error('format 옵션은 export|env|json 중 하나여야 합니다.');
      }
      format = value;
    },
    out: (value) => {
      out = value;
    },
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

    const handler = handlers[key];

    if (!handler) {
      throw new Error(`지원하지 않는 옵션: --${key}`);
    }

    handler(next);
    index += 1;
  }

  return { stage, profile, region, format, out };
};

const formatOutput = (
  env: Record<string, string>,
  format: CliOptions['format'],
): string => {
  if (format === 'export') {
    return `${formatExportLines(env).join('\n')}\n`;
  }

  if (format === 'env') {
    return `${serializeEnvFile(env)}\n`;
  }

  return `${JSON.stringify(env, null, 2)}\n`;
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));
  const rawEnv = fetchLambdaEnv({
    functionName: `pet-server-${options.stage}`,
    profile: options.profile,
    region: options.region,
  });

  const stagePrefix = `PET_SERVER_${options.stage.toUpperCase()}_`;
  const env: Record<string, string> = {};

  Object.entries(rawEnv).forEach(([key, value]) => {
    env[key] = value;

    const stageKey = `${stagePrefix}${key}`;
    if (!(stageKey in rawEnv)) {
      env[stageKey] = value;
    }
  });

  const output = formatOutput(env, options.format);

  if (typeof options.out === 'string') {
    writeFileSync(options.out, output);
    return;
  }

  process.stdout.write(output);
};

try {
  main();
} catch (error: unknown) {
  console.error('Lambda 환경 변수 추출에 실패했습니다.', error);
  process.exit(1);
}
