export interface AuthTokenPair {
  token: string;
  refreshToken: string;
  displayName: string | null;
  avatarUrl: string | null;
}
