import type { KakaoConfig } from '../kakao-flow';
import {
  createKakaoTokenRequest,
  extractKakaoProfile,
  toUpsertUserCommand,
} from '../kakao-flow';

describe('kakao-flow (domain)', () => {
  describe('createKakaoTokenRequest', () => {
    it('creates token request details from code and config', () => {
      const config: KakaoConfig = {
        clientId: 'cid',
        redirectUri: 'https://app.example.com/callback',
        clientSecret: 'csecret',
      };

      const result = createKakaoTokenRequest(config, 'auth-code');

      expect(result.url).toBe('https://kauth.kakao.com/oauth/token');
      expect(result.headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      expect(result.params.toString().split('&').sort()).toEqual(
        [
          'grant_type=authorization_code',
          'client_id=cid',
          'client_secret=csecret',
          'redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback',
          'code=auth-code',
        ].sort(),
      );
    });
  });

  describe('extractKakaoProfile', () => {
    it('extracts id, nickname, and avatarUrl from the response', () => {
      const profile = extractKakaoProfile({
        id: 987,
        kakao_account: {
          profile: {
            nickname: 'Moomin',
            profile_image_url: ' https://cdn.kakao/neo.png ',
          },
        },
      });

      expect(profile).toEqual({
        id: '987',
        nickname: 'Moomin',
        avatarUrl: 'https://cdn.kakao/neo.png',
      });
    });

    it('omits avatarUrl when profile image is missing', () => {
      const profile = extractKakaoProfile({
        id: 123,
        kakao_account: {
          profile: { nickname: 'Toto', thumbnail_image_url: null },
        },
      });

      expect(profile).toEqual({ id: '123', nickname: 'Toto' });
    });

    it('throws when the required id is missing', () => {
      expect(() => extractKakaoProfile({ kakao_account: {} })).toThrow(
        'invalid-kakao-profile',
      );
    });
  });

  describe('toUpsertUserCommand', () => {
    it('converts a Kakao profile to an upsert command', () => {
      const upsert = toUpsertUserCommand({ id: '123', nickname: 'Toto' });

      expect(upsert).toEqual({
        where: { kakaoId: '123' },
        create: { kakaoId: '123', displayName: 'Toto' },
        update: { displayName: 'Toto' },
      });
    });

    it('includes avatar in the upsert when present', () => {
      const upsert = toUpsertUserCommand({
        id: 'avatar-user',
        nickname: 'Toto',
        avatarUrl: 'https://cdn.kakao/avatar.png',
      });

      expect(upsert).toEqual({
        where: { kakaoId: 'avatar-user' },
        create: {
          kakaoId: 'avatar-user',
          displayName: 'Toto',
          avatarUrl: 'https://cdn.kakao/avatar.png',
        },
        update: {
          displayName: 'Toto',
          avatarUrl: 'https://cdn.kakao/avatar.png',
        },
      });
    });

    it('returns without displayName when nickname is absent', () => {
      const upsert = toUpsertUserCommand({ id: '123' });

      expect(upsert).toEqual({
        where: { kakaoId: '123' },
        create: { kakaoId: '123' },
        update: {},
      });
    });
  });
});
