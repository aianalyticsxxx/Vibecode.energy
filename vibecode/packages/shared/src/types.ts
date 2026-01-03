export interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export interface Vibe {
  id: string;
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  imageUrl: string;
  caption: string | null;
  vibeDate: string;
  createdAt: string;
  reactionCount: number;
  hasVibed: boolean;
}

export interface FeedResponse {
  vibes: Vibe[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  imageUrl: string;
  key: string;
}
