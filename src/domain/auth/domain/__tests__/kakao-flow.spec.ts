import type { KakaoConfig } from '../kakao-flow';
import {
  createKakaoTokenRequest,
  extractKakaoProfile,
  toUpsertUserCommand,
} from '../kakao-flow';

describe('kakao-flow (domain)', () => {
  describe('createKakaoTokenRequest', () => {
    it('코드와 설정을 받아 토큰 요청 정보를 만든다', () => {
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
    it('응답 데이터에서 id, nickname, avatarUrl을 읽어온다', () => {
      const profile = extractKakaoProfile({
        id: 987,
        kakao_account: {
          profile: {
            nickname: '무민',
            profile_image_url: ' https://cdn.kakao/neo.png ',
          },
        },
      });

      expect(profile).toEqual({
        id: '987',
        nickname: '무민',
        avatarUrl: 'https://cdn.kakao/neo.png',
      });
    });

    it('프로필 이미지가 없으면 avatarUrl을 제외한다', () => {
      const profile = extractKakaoProfile({
        id: 123,
        kakao_account: {
          profile: { nickname: '토토', thumbnail_image_url: null },
        },
      });

      expect(profile).toEqual({ id: '123', nickname: '토토' });
    });

    it('필수 id가 없으면 에러를 던진다', () => {
      expect(() => extractKakaoProfile({ kakao_account: {} })).toThrow(
        'invalid-kakao-profile',
      );
    });
  });

  describe('toUpsertUserCommand', () => {
    it('카카오 프로필을 upsert 커맨드로 변환한다', () => {
      const upsert = toUpsertUserCommand({ id: '123', nickname: '토토' });

      expect(upsert).toEqual({
        where: { kakaoId: '123' },
        create: { kakaoId: '123', displayName: '토토' },
        update: { displayName: '토토' },
      });
    });

    it('아바타가 있으면 upsert에 포함한다', () => {
      const upsert = toUpsertUserCommand({
        id: 'avatar-user',
        nickname: '토토',
        avatarUrl: 'https://cdn.kakao/avatar.png',
      });

      expect(upsert).toEqual({
        where: { kakaoId: 'avatar-user' },
        create: {
          kakaoId: 'avatar-user',
          displayName: '토토',
          avatarUrl: 'https://cdn.kakao/avatar.png',
        },
        update: {
          displayName: '토토',
          avatarUrl: 'https://cdn.kakao/avatar.png',
        },
      });
    });

    it('닉네임이 없으면 displayName 없이 반환한다', () => {
      const upsert = toUpsertUserCommand({ id: '123' });

      expect(upsert).toEqual({
        where: { kakaoId: '123' },
        create: { kakaoId: '123' },
        update: {},
      });
    });
  });
});
