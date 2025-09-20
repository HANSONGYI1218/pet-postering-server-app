export interface KakaoConfig {
  clientId: string;
  redirectUri: string;
  clientSecret?: string;
}

export interface KakaoTokenRequest {
  url: string;
  params: URLSearchParams;
  headers: Record<string, string>;
}

export interface KakaoProfile {
  id: string;
  nickname?: string;
}

export interface UpsertUserCommand {
  where: { kakaoId: string };
  create: { kakaoId: string; displayName?: string };
  update: { displayName?: string };
}

const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const TOKEN_REQUEST_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
} as const;

export const createKakaoTokenRequest = (
  config: KakaoConfig,
  code: string,
): KakaoTokenRequest => {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code,
  });
  if (config.clientSecret) params.append('client_secret', config.clientSecret);

  return {
    url: KAKAO_TOKEN_URL,
    headers: { ...TOKEN_REQUEST_HEADERS },
    params,
  };
};

export const extractKakaoProfile = (payload: unknown): KakaoProfile => {
  const source = payload as {
    id?: number | string | null;
    kakao_account?: { profile?: { nickname?: string | null } };
  };
  const idValue = source.id;
  if (idValue === undefined || idValue === null)
    throw new Error('invalid-kakao-profile');
  const nickname = source.kakao_account?.profile?.nickname ?? undefined;
  const trimmed = nickname?.trim();
  return trimmed
    ? { id: String(idValue), nickname: trimmed }
    : { id: String(idValue) };
};

export const toUpsertUserCommand = (
  profile: KakaoProfile,
): UpsertUserCommand => {
  const displayName = profile.nickname?.trim();
  return {
    where: { kakaoId: profile.id },
    create: displayName
      ? { kakaoId: profile.id, displayName }
      : { kakaoId: profile.id },
    update: displayName ? { displayName } : {},
  };
};
