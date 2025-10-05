export interface UserProfileResult {
  id: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  zipcode: string | null;
  address: string | null;
  addressDetail: string | null;
  introduction: string | null;
  isEligibleForFoster: boolean;
}

export interface UserNotificationSettingResult {
  commentEmail: boolean;
  fosterAnimalInfoEmail: boolean;
  fosterAnimalInfoKakao: boolean;
  marketingEmail: boolean;
  marketingKakao: boolean;
}

export interface UserPostListItem {
  id: string;
  title: string;
  content: string;
  views: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCommentListItem {
  id: string;
  postId: string;
  content: string;
  createdAt: Date;
  likes: number;
  post: {
    id: string;
    title: string;
  } | null;
}
