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
  avatarUrl?: string;
}

const trimOrUndefined = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

export interface UpsertUserCommand {
  where: { kakaoId: string };
  create: { kakaoId: string; displayName?: string; avatarUrl?: string };
  update: { displayName?: string; avatarUrl?: string };
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
  if (config.clientSecret) {
    params.append('client_secret', config.clientSecret);
  }

  return {
    url: KAKAO_TOKEN_URL,
    headers: { ...TOKEN_REQUEST_HEADERS },
    params,
  };
};

export const extractKakaoProfile = (payload: unknown): KakaoProfile => {
  const source = payload as {
    id?: number | string | null;
    kakao_account?: {
      profile?: {
        nickname?: string | null;
        profile_image_url?: string | null;
        thumbnail_image_url?: string | null;
      };
    };
  };

  const idValue = source.id;
  if (idValue === undefined || idValue === null) {
    throw new Error('invalid-kakao-profile');
  }

  const profile = source.kakao_account?.profile;
  const nickname = trimOrUndefined(profile?.nickname);
  const primaryAvatar = trimOrUndefined(profile?.profile_image_url);
  const fallbackAvatar = trimOrUndefined(profile?.thumbnail_image_url);
  const avatarUrl = primaryAvatar ?? fallbackAvatar;

  const result: KakaoProfile = { id: String(idValue) };

  if (nickname) {
    result.nickname = nickname;
  }

  if (avatarUrl) {
    result.avatarUrl = avatarUrl;
  }

  return result;
};

export const toUpsertUserCommand = (profile: KakaoProfile): UpsertUserCommand => {
  const displayName = profile.nickname?.trim();
  const avatarUrl = profile.avatarUrl?.trim();
  return {
    where: { kakaoId: profile.id },
    create: {
      kakaoId: profile.id,
      ...(displayName ? { displayName } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    },
    update: {
      ...(displayName ? { displayName } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  };
};
