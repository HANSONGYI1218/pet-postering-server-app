#!/usr/bin/env ts-node

const parseArgs = (
  argv: readonly string[],
): { url: string; retries: number; delayMs: number } => {
  let url: string | undefined;
  let retries = 3;
  let delayMs = 2000;

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
      case 'url':
        url = next;
        break;
      case 'retries':
        retries = Number.parseInt(next, 10);
        break;
      case 'delay':
        delayMs = Number.parseInt(next, 10);
        break;
      default:
        throw new Error(`지원하지 않는 옵션: --${key}`);
    }

    index += 1;
  }

  if (!url) {
    const domain = process.env.PET_SERVER_PROD_API_DOMAIN ?? 'api.furdiz.com';
    url = `https://${domain}/health`;
  }

  return { url, retries, delayMs };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const main = async (): Promise<void> => {
  const { url, retries, delayMs } = parseArgs(process.argv.slice(2));

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < retries) {
    attempt += 1;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`헬스 체크 실패 (${response.status.toString()}): ${text}`);
      }

      process.stdout.write(`헬스 체크 성공 (${response.status.toString()}): ${url}\n`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `헬스 체크 재시도 (${attempt.toString()}/${retries.toString()}):`,
        lastError.message,
      );
      await sleep(delayMs);
    }
  }

  console.error('헬스 체크에 실패했습니다.', lastError);
  process.exit(1);
};

main().catch((error: unknown) => {
  console.error('헬스 체크 스크립트 실행 실패', error);
  process.exit(1);
});
