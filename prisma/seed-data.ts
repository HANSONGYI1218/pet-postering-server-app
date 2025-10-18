import {
  AnimalEnvironmentTagType,
  AnimalGender,
  AnimalHealthTagType,
  AnimalPersonalityTagType,
  AnimalSize,
  AnimalSpecialNoteTagType,
  AnimalStatus,
  AnimalType,
  NoticeType,
  Role,
} from '@prisma/client';

export interface OrganizationSeed {
  id: string;
  name: string;
  address: string;
  addressDetail: string;
  zipcode: string;
  phoneNumber: string;
  email: string;
  donationBankName: string;
  donationAccountNumber: string;
  donationAccountHolder: string;
}

export interface AnimalImageSeed {
  url: string;
  sortOrder?: number;
}

export interface AnimalSeed {
  id: string;
  name: string;
  type: AnimalType;
  size: AnimalSize;
  gender: AnimalGender;
  breed: string;
  birthDate: Date;
  introduction: string;
  remark: string;
  emergency: boolean;
  emergencyReason: string | null;
  currentFosterStartDate: Date;
  currentFosterEndDate: Date;
  orgId: string;
  shared: boolean;
  status: AnimalStatus;
  images: AnimalImageSeed[];
  healthTags: AnimalHealthTagType[];
  personalityTags: AnimalPersonalityTagType[];
  environmentTags: AnimalEnvironmentTagType[];
  specialNoteTags: AnimalSpecialNoteTagType[];
}

export interface RecordSeed {
  animalId: string;
  entries: {
    date: Date;
    content: string;
    healthNote: string;
    images: string[];
  }[];
}

export interface CommunityUserSeed {
  id: string;
  kakaoId: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: Role;
}

export interface CommunityPostSeed {
  id: string;
  authorId: string;
  title: string;
  content: string;
  viewCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CommunityCommentSeed {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string | null;
  createdAt: Date;
}

export interface NoticeSeed {
  id: string;
  title: string;
  content: string;
  type: NoticeType;
  isFixed?: boolean;
  createdAt: Date;
  attachments?: string[];
}

export const organizationSeeds: OrganizationSeed[] = [
  {
    id: 'seed-org-hope-shelter',
    name: '희망 동물 보호소',
    address: '서울특별시 마포구 성미산로 12',
    addressDetail: '1층',
    zipcode: '04057',
    phoneNumber: '02-123-4567',
    email: 'hello@hope-shelter.org',
    donationBankName: '국민은행',
    donationAccountNumber: '123456-01-123456',
    donationAccountHolder: '희망 동물 보호소',
  },
  {
    id: 'seed-org-sunshine',
    name: '선샤인 케어 센터',
    address: '경기도 성남시 중원구 둔촌대로 45',
    addressDetail: 'B동 302호',
    zipcode: '13347',
    phoneNumber: '031-987-6543',
    email: 'support@sunshinecare.org',
    donationBankName: '신한은행',
    donationAccountNumber: '201-2222-555555',
    donationAccountHolder: '선샤인 케어 센터',
  },
];

export const noticeSeeds: NoticeSeed[] = [
  {
    id: 'seed-notice-maintenance-oct',
    title: '10월 정기 점검 안내',
    content:
      '안녕하세요, 퍼디즈입니다.\n\n더 안정적인 서비스 제공을 위해 10월 22일(화) 02:00~04:00 사이에 정기 점검을 진행합니다.\n점검 시간 동안 서비스 이용이 일시 중단되니 이용에 참고 부탁드립니다.\n\n감사합니다.',
    type: NoticeType.MAINTENANCE,
    isFixed: true,
    createdAt: new Date('2025-10-15T02:00:00.000Z'),
    attachments: ['https://cdn.furdiz.com/notices/oct-maintenance.pdf'],
  },
  {
    id: 'seed-notice-event-donation',
    title: '겨울 맞이 모금 캠페인 참여 안내',
    content:
      '추운 겨울을 대비해 보호소 동물들을 위한 모금 캠페인을 시작합니다.\n\n참여 방법\n1. 지정 계좌로 후원금을 보내주세요.\n2. 물품 후원을 원하시면 고객센터로 문의해주세요.\n\n여러분의 따뜻한 관심이 큰 힘이 됩니다.',
    type: NoticeType.EVENT,
    isFixed: false,
    createdAt: new Date('2025-10-10T09:00:00.000Z'),
    attachments: [],
  },
  {
    id: 'seed-notice-policy-update',
    title: '개인정보 처리방침 개정 안내',
    content:
      '개인정보 처리방침이 2025년 11월 1일부로 개정됩니다.\n주요 변경 사항은 다음과 같습니다.\n- 위탁 업체 목록 업데이트\n- 개인정보 보유 기간 명시 강화\n\n자세한 내용은 첨부된 문서를 확인해주세요.',
    type: NoticeType.POLICY,
    isFixed: false,
    createdAt: new Date('2025-10-05T00:00:00.000Z'),
    attachments: ['https://cdn.furdiz.com/notices/privacy-policy-2025.pdf'],
  },
];

export const animalSeeds: AnimalSeed[] = [
  {
    id: 'seed-animal-latte',
    name: '라떼',
    type: AnimalType.DOG,
    size: AnimalSize.SMALL,
    gender: AnimalGender.FEMALE,
    breed: '말티즈 믹스',
    birthDate: new Date('2023-03-15'),
    introduction: '사람을 좋아하고 산책을 즐기는 밝은 성격의 강아지입니다.',
    remark: '기본 훈련이 잘 되어 있고, 조용한 환경을 선호해요.',
    emergency: true,
    emergencyReason: '현재 임보 가정의 계약 만료가 임박했습니다.',
    currentFosterStartDate: new Date('2025-09-01'),
    currentFosterEndDate: new Date('2025-11-30'),
    orgId: 'seed-org-hope-shelter',
    shared: true,
    status: AnimalStatus.IN_PROGRESS,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a',
        sortOrder: 0,
      },
      {
        url: 'https://images.unsplash.com/photo-1557979619-445218b5c110',
        sortOrder: 1,
      },
    ],
    healthTags: [
      AnimalHealthTagType.VACCINATED,
      AnimalHealthTagType.NEUTERED,
      AnimalHealthTagType.MICROCHIPPED,
    ],
    personalityTags: [
      AnimalPersonalityTagType.FRIENDLY_WITH_PEOPLE,
      AnimalPersonalityTagType.GOOD_WITH_OTHER_ANIMAL,
    ],
    environmentTags: [
      AnimalEnvironmentTagType.QUIET_ENVIRONMENT,
      AnimalEnvironmentTagType.PATIENCE_WITH_BARKING_BITING,
    ],
    specialNoteTags: [AnimalSpecialNoteTagType.SEPARATION_ANXIETY],
  },
  {
    id: 'seed-animal-nabi',
    name: '나비',
    type: AnimalType.CAT,
    size: AnimalSize.MEDIUM,
    gender: AnimalGender.FEMALE,
    breed: '코리안 숏헤어',
    birthDate: new Date('2022-08-20'),
    introduction: '호기심이 많고 사람에게 먼저 다가오는 사랑스러운 고양이입니다.',
    remark: '규칙적인 식습관을 가지고 있으며, 다른 고양이와도 잘 지냅니다.',
    emergency: false,
    emergencyReason: null,
    currentFosterStartDate: new Date('2025-07-10'),
    currentFosterEndDate: new Date('2025-10-10'),
    orgId: 'seed-org-hope-shelter',
    shared: true,
    status: AnimalStatus.IN_PROGRESS,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131',
        sortOrder: 0,
      },
      {
        url: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13',
        sortOrder: 1,
      },
    ],
    healthTags: [AnimalHealthTagType.VACCINATED, AnimalHealthTagType.DEWORMED],
    personalityTags: [
      AnimalPersonalityTagType.QUIET,
      AnimalPersonalityTagType.INDEPENDENCE,
    ],
    environmentTags: [
      AnimalEnvironmentTagType.QUIET_ENVIRONMENT,
      AnimalEnvironmentTagType.HOUSEHOLD_WITH_YOUNG_CHILDREN,
    ],
    specialNoteTags: [AnimalSpecialNoteTagType.MEDICATION_REQUIRED],
  },
  {
    id: 'seed-animal-mongsil',
    name: '몽실',
    type: AnimalType.DOG,
    size: AnimalSize.LARGE,
    gender: AnimalGender.MALE,
    breed: '진돗개 믹스',
    birthDate: new Date('2021-12-05'),
    introduction: '튼튼하고 에너지가 넘치지만 사람을 잘 따르는 든든한 친구입니다.',
    remark: '입질이나 짖음이 거의 없고, 꾸준한 운동을 필요로 합니다.',
    emergency: false,
    emergencyReason: null,
    currentFosterStartDate: new Date('2025-08-15'),
    currentFosterEndDate: new Date('2025-12-15'),
    orgId: 'seed-org-sunshine',
    shared: true,
    status: AnimalStatus.COMPLETED,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1507149833265-60c372daea22',
        sortOrder: 0,
      },
      {
        url: 'https://images.unsplash.com/photo-1558788353-f76d92427f16',
        sortOrder: 1,
      },
    ],
    healthTags: [
      AnimalHealthTagType.VACCINATED,
      AnimalHealthTagType.HEARTWORM_TESTED,
      AnimalHealthTagType.FLEA_TICK_TREATED,
    ],
    personalityTags: [
      AnimalPersonalityTagType.ENERGETIC,
      AnimalPersonalityTagType.FRIENDLY_WITH_PEOPLE,
    ],
    environmentTags: [
      AnimalEnvironmentTagType.AVAILABILITY_FOR_WALKS_PLAY,
      AnimalEnvironmentTagType.PRESENCE_OF_OTHER_ANIMAL,
    ],
    specialNoteTags: [AnimalSpecialNoteTagType.ONGOING_TREATMENT_OR_RECOVERY],
  },
];

export const recordSeeds: RecordSeed[] = [
  {
    animalId: 'seed-animal-latte',
    entries: [
      {
        date: new Date('2025-09-02T10:00:00Z'),
        content: '첫날부터 활발하게 잘 놀았어요!',
        healthNote: '식욕 좋고 대소변 문제 없음.',
        images: ['https://images.unsplash.com/photo-1507146426996-ef05306b995a'],
      },
      {
        date: new Date('2025-09-05T09:30:00Z'),
        content: '산책 중 다른 강아지와 인사했어요.',
        healthNote: '피부 상태 양호.',
        images: ['https://images.unsplash.com/photo-1557979619-445218b5c110'],
      },
    ],
  },
  {
    animalId: 'seed-animal-nabi',
    entries: [
      {
        date: new Date('2025-08-11T14:10:00Z'),
        content: '해가 잘 드는 곳에서 낮잠을 즐겼어요.',
        healthNote: '식사량 안정적.',
        images: ['https://images.unsplash.com/photo-1518791841217-8f162f1e1131'],
      },
      {
        date: new Date('2025-08-15T18:45:00Z'),
        content: '장난감을 쫓아다니며 활동량이 증가했어요.',
        healthNote: '눈물 자국 관리 필요.',
        images: ['https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13'],
      },
    ],
  },
  {
    animalId: 'seed-animal-mongsil',
    entries: [
      {
        date: new Date('2025-09-20T07:20:00Z'),
        content: '새 산책 루트를 좋아합니다.',
        healthNote: '발바닥 상태 양호.',
        images: ['https://images.unsplash.com/photo-1507149833265-60c372daea22'],
      },
      {
        date: new Date('2025-09-23T12:05:00Z'),
        content: '놀이터에서 공놀이를 즐겼어요.',
        healthNote: '예방접종 후 이상 없음.',
        images: ['https://images.unsplash.com/photo-1558788353-f76d92427f16'],
      },
    ],
  },
];

export const communityUserSeeds: CommunityUserSeed[] = [
  {
    id: 'seed-user-luna',
    kakaoId: 'seed-kakao-luna',
    displayName: '루나',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    role: Role.USER,
  },
  {
    id: 'seed-user-hodu',
    kakaoId: 'seed-kakao-hodu',
    displayName: '호두',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
    role: Role.USER,
  },
];

export const communityPostSeeds: CommunityPostSeed[] = [
  {
    id: 'seed-post-welcome',
    authorId: 'seed-user-luna',
    title: '첫 임보, 이렇게 준비했어요',
    content:
      '이번 달부터 고양이 임보를 시작했어요. 준비물 체크리스트를 공유해요!\n\n- 사료와 물그릇\n- 안전한 숨숨집\n- 하루 10분 케어 일정',
    viewCount: 34,
    createdAt: new Date('2025-01-12T09:00:00Z'),
  },
  {
    id: 'seed-post-tip',
    authorId: 'seed-user-hodu',
    title: '산책이 두려운 반려견을 도와준 방법',
    content:
      '입양 초기 산책을 무서워하던 강아지가 2주 만에 씩씩하게 걷게 된 비결을 나눠요.\n\n1. 짧은 거리에서 출발하기\n2. 간식으로 좋은 기억 심어주기\n3. 하루 한 번은 천천히 걷기',
    viewCount: 21,
    createdAt: new Date('2025-01-18T11:30:00Z'),
  },
];

export const communityCommentSeeds: CommunityCommentSeed[] = [
  {
    id: 'seed-comment-welcome-1',
    postId: 'seed-post-welcome',
    authorId: 'seed-user-hodu',
    content: '체크리스트 감사합니다! 숨숨집 추천해주실 수 있나요?',
    createdAt: new Date('2025-01-12T10:15:00Z'),
  },
  {
    id: 'seed-comment-welcome-2',
    postId: 'seed-post-welcome',
    authorId: 'seed-user-luna',
    content: '저는 접이식 숨숨집을 사용했어요. 청소가 쉬워서 좋아요!',
    parentId: 'seed-comment-welcome-1',
    createdAt: new Date('2025-01-12T10:45:00Z'),
  },
  {
    id: 'seed-comment-tip-1',
    postId: 'seed-post-tip',
    authorId: 'seed-user-luna',
    content: '저희 강아지도 단계별로 연습하니 금방 적응했어요!',
    createdAt: new Date('2025-01-18T12:10:00Z'),
  },
];

export interface UserProfileSeed {
  userId: string;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  zipcode?: string | null;
  address?: string | null;
  addressDetail?: string | null;
  introduction?: string | null;
  isEligibleForFoster?: boolean;
}

export interface UserNotificationSettingSeed {
  userId: string;
  commentEmail?: boolean;
  fosterAnimalInfoEmail?: boolean;
  fosterAnimalInfoKakao?: boolean;
  marketingEmail?: boolean;
  marketingKakao?: boolean;
}

export const userProfileSeeds: UserProfileSeed[] = [
  {
    userId: 'seed-user-luna',
    name: '이지은',
    email: 'luna@example.com',
    phoneNumber: '010-1000-2000',
    zipcode: '04057',
    address: '서울특별시 마포구 성미산로 12',
    addressDetail: '1층',
    introduction:
      '반려동물 임시보호 3년차입니다. 안정적인 환경을 제공하기 위해 꾸준히 공부하고 있어요.',
    isEligibleForFoster: true,
  },
  {
    userId: 'seed-user-hodu',
    name: '박호두',
    email: 'hodu@example.com',
    phoneNumber: '010-3000-4000',
    zipcode: '13347',
    address: '경기도 성남시 중원구 둔촌대로 45',
    addressDetail: 'B동 302호',
    introduction: '첫 임보를 준비 중이라 선배 임보자 분들의 조언을 모으고 있습니다!',
    isEligibleForFoster: false,
  },
];

export const userNotificationSettingSeeds: UserNotificationSettingSeed[] = [
  {
    userId: 'seed-user-luna',
    commentEmail: true,
    fosterAnimalInfoEmail: true,
    fosterAnimalInfoKakao: true,
    marketingEmail: false,
    marketingKakao: false,
  },
  {
    userId: 'seed-user-hodu',
    commentEmail: true,
    fosterAnimalInfoEmail: false,
    fosterAnimalInfoKakao: true,
    marketingEmail: true,
    marketingKakao: false,
  },
];
