#!/usr/bin/env ts-node

const REQUIRED_KEYS = [
  'PET_SERVER_PROD_DATABASE_URL',
  'PET_SERVER_PROD_DIRECT_DATABASE_URL',
  'PET_SERVER_PROD_JWT_ACCESS_SECRET',
  'PET_SERVER_PROD_JWT_REFRESH_SECRET',
  'PET_SERVER_PROD_KAKAO_CLIENT_ID',
  'PET_SERVER_PROD_KAKAO_CLIENT_SECRET',
  'PET_SERVER_PROD_KAKAO_REDIRECT_URI',
  'PET_SERVER_PROD_KAKAO_LOGOUT_REDIRECT_URI',
] as const;

const missing = REQUIRED_KEYS.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error('다음 환경 변수가 필요합니다:', missing.join(', '));
  process.exit(1);
}

process.stdout.write('필수 프로덕션 환경 변수가 모두 설정되었습니다.\n');
