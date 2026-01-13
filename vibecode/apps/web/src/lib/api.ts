import { getToken } from './auth';

// Use proxy for API calls - rewrites handle routing to the correct backend
const API_URL = '/api';

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

// Shot = what users post (formerly "vibe")
export interface Shot {
  id: string;
  prompt: string;
  imageUrl: string;
  caption: string | null;
  resultType: 'image' | 'video' | 'link' | 'embed';
  embedHtml?: string;
  externalUrl?: string;
  createdAt: string;
  sparkleCount: number;
  hasSparkled: boolean;
  commentCount: number;
  challengeId?: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

// Keep Vibe as alias for backwards compatibility during migration
export type Vibe = Shot;

export interface Comment {
  id: string;
  shotId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface CommentsResponse {
  comments: Comment[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface FollowListResponse {
  users: FollowUser[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  lastActiveAt: string;
}

// Challenge types
export interface Challenge {
  id: string;
  title: string;
  description?: string;
  createdBy?: string;
  isOfficial: boolean;
  isSponsored: boolean;
  sponsorName?: string;
  prizeDescription?: string;
  startsAt: string;
  endsAt: string;
  votingEndsAt?: string;
  createdAt: string;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  submissionCount?: number;
}

export interface ChallengeVote {
  id: string;
  shotId: string;
  userId: string;
  creativityScore: number;
  usefulnessScore: number;
  qualityScore: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  shotId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  prompt: string;
  imageUrl: string;
  averageScore: number;
  voteCount: number;
  totalScore: number;
}

export interface Reaction {
  id: string;
  shotId: string;
  userId: string;
  reactionType: 'sparkle' | 'photo';
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface ReactionsResponse {
  reactions: Reaction[];
  total: number;
  sparkleCount: number;
  photoCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ShotsFeedResponse {
  shots: Shot[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Keep old name for backwards compatibility
export type VibesFeedResponse = ShotsFeedResponse;

export interface ChallengesResponse {
  challenges: Challenge[];
  nextCursor?: string;
  hasMore?: boolean;
}

/**
 * Base fetch wrapper with auth
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: errorData.error || errorData.message || 'An error occurred',
          statusCode: response.status,
        },
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        statusCode: 0,
      },
    };
  }
}

/**
 * GET request
 */
export function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export function post<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export function put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request
 */
export function patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { method: 'DELETE' });
}

/**
 * Upload file with multipart form data
 */
export async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<ApiResponse<T>> {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  try {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: errorData.error || errorData.message || 'Upload failed',
          statusCode: response.status,
        },
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Upload error',
        statusCode: 0,
      },
    };
  }
}

// API Endpoints
export const api = {
  // Auth
  getMe: () => get<{ user: import('./auth').User }>('/auth/me'),

  // Shots (formerly Vibes)
  getFeed: (cursor?: string, sort: 'recent' | 'popular' = 'recent') =>
    get<ShotsFeedResponse>(`/shots?sort=${sort}${cursor ? `&cursor=${cursor}` : ''}`),

  getShot: (id: string) => get<Shot>(`/shots/${id}`),

  createShot: (file: File, prompt: string, caption?: string, challengeId?: string) =>
    uploadFile<Shot>('/shots', file, {
      prompt,
      ...(caption ? { caption } : {}),
      ...(challengeId ? { challengeId } : {}),
    }),

  // Video upload with text-only prompt
  createVideoShot: (file: File, prompt: string, caption?: string) =>
    uploadFile<Shot>('/shots', file, {
      prompt,
      ...(caption ? { caption } : {}),
    }),

  deleteShot: (id: string) => del<void>(`/shots/${id}`),

  // Following feed
  getFollowingFeed: (cursor?: string) =>
    get<ShotsFeedResponse>(`/shots/following${cursor ? `?cursor=${cursor}` : ''}`),

  // Sparkles
  sparkleShot: (shotId: string) => post<{ sparkleCount: number }>(`/shots/${shotId}/sparkle`),

  unsparkleShot: (shotId: string) => del<{ sparkleCount: number }>(`/shots/${shotId}/sparkle`),

  // Photo reactions
  addPhotoReaction: (shotId: string, imageUrl: string, imageKey: string) =>
    post<{ success: boolean; reactionCount: number }>(`/shots/${shotId}/reactions/photo`, { imageUrl, imageKey }),

  removePhotoReaction: (shotId: string) =>
    del<{ success: boolean; reactionCount: number }>(`/shots/${shotId}/reactions/photo`),

  getReactions: (shotId: string) => get<ReactionsResponse>(`/shots/${shotId}/reactions`),

  // Users
  getUser: (username: string) =>
    get<import('./auth').User>(`/users/${username}`),

  getUserShots: (username: string, cursor?: string) =>
    get<PaginatedResponse<Shot>>(`/users/${username}/shots${cursor ? `?cursor=${cursor}` : ''}`),

  updateProfile: (data: { displayName?: string; bio?: string }) =>
    patch<{ user: import('./auth').User }>('/users/me', data),

  // Challenges
  getChallenges: (filter: 'active' | 'upcoming' | 'completed' | 'all' = 'active') =>
    get<ChallengesResponse>(`/challenges?filter=${filter}`),

  getChallenge: (id: string) => get<Challenge>(`/challenges/${id}`),

  getChallengeShots: (challengeId: string, cursor?: string) =>
    get<ShotsFeedResponse>(`/challenges/${challengeId}/shots${cursor ? `?cursor=${cursor}` : ''}`),

  getChallengeLeaderboard: (challengeId: string) =>
    get<{ leaderboard: LeaderboardEntry[]; challenge: Challenge }>(`/challenges/${challengeId}/leaderboard`),

  createChallenge: (data: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt: string;
    votingEndsAt?: string;
    isOfficial?: boolean;
  }) => post<Challenge>('/challenges', data),

  submitToChallenge: (shotId: string, challengeId: string) =>
    post<{ success: boolean }>(`/shots/${shotId}/challenge`, { challengeId }),

  voteOnShot: (challengeId: string, shotId: string, scores: {
    creativityScore: number;
    usefulnessScore: number;
    qualityScore: number;
  }) => post<{ vote: ChallengeVote }>(`/challenges/${challengeId}/vote/${shotId}`, scores),

  getUserVote: (challengeId: string, shotId: string) =>
    get<{ vote: ChallengeVote }>(`/challenges/${challengeId}/vote/${shotId}`),

  // Follow system
  followUser: (userId: string) =>
    post<{ success: boolean; followerCount: number }>(`/users/${userId}/follow`),

  unfollowUser: (userId: string) =>
    del<{ success: boolean; followerCount: number }>(`/users/${userId}/follow`),

  getFollowStatus: (userId: string) =>
    get<{ isFollowing: boolean; followerCount: number; followingCount: number }>(`/users/${userId}/follow/status`),

  getFollowers: (userId: string, cursor?: string) =>
    get<FollowListResponse>(`/users/${userId}/followers${cursor ? `?cursor=${cursor}` : ''}`),

  getFollowing: (userId: string, cursor?: string) =>
    get<FollowListResponse>(`/users/${userId}/following${cursor ? `?cursor=${cursor}` : ''}`),

  // Comments
  getComments: (shotId: string, cursor?: string) =>
    get<CommentsResponse>(`/shots/${shotId}/comments${cursor ? `?cursor=${cursor}` : ''}`),

  addComment: (shotId: string, content: string) =>
    post<{ comment: Comment; commentCount: number }>(`/shots/${shotId}/comments`, { content }),

  deleteComment: (shotId: string, commentId: string) =>
    del<{ success: boolean; commentCount: number }>(`/shots/${shotId}/comments/${commentId}`),

  // Presence
  updatePresence: () => patch<{ success: boolean }>('/users/me/presence'),

  getOnlineFriends: () => get<{ users: OnlineUser[] }>('/users/me/following/online'),

  // Legacy aliases for backwards compatibility
  getVibe: (id: string) => get<Shot>(`/shots/${id}`),
  createVibe: (file: File, caption?: string) =>
    uploadFile<Shot>('/shots', file, { prompt: caption || 'One-shot creation', ...(caption ? { caption } : {}) }),
  deleteVibe: (id: string) => del<void>(`/shots/${id}`),
  sparkleVibe: (shotId: string) => post<{ sparkleCount: number }>(`/shots/${shotId}/sparkle`),
  unsparkleVibe: (shotId: string) => del<{ sparkleCount: number }>(`/shots/${shotId}/sparkle`),
  getDiscoveryFeed: (cursor?: string, sort: 'recent' | 'popular' = 'recent') =>
    get<ShotsFeedResponse>(`/shots?sort=${sort}${cursor ? `&cursor=${cursor}` : ''}`),
  getUserVibes: (username: string, cursor?: string) =>
    get<PaginatedResponse<Shot>>(`/users/${username}/shots${cursor ? `?cursor=${cursor}` : ''}`),
};
