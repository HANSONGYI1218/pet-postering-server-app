export interface JwtPayload {
  sub: string;
  role: string;
  displayName?: string;
  avatarUrl?: string;
}
