import { getToken } from './auth';

// Use proxy in development for same-origin cookies
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface Vibe {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  sparkleCount: number;
  hasSparkled: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
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
          message: errorData.message || 'An error occurred',
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
          message: errorData.message || 'Upload failed',
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

  // Vibes
  getFeed: (cursor?: string) =>
    get<PaginatedResponse<Vibe>>(`/vibes${cursor ? `?cursor=${cursor}` : ''}`),

  getVibe: (id: string) => get<Vibe>(`/vibes/${id}`),

  createVibe: (file: File, caption?: string) =>
    uploadFile<Vibe>('/vibes', file, caption ? { caption } : undefined),

  deleteVibe: (id: string) => del<void>(`/vibes/${id}`),

  // Sparkles
  sparkleVibe: (vibeId: string) => post<{ sparkleCount: number }>(`/vibes/${vibeId}/sparkle`),

  unsparkleVibe: (vibeId: string) => del<{ sparkleCount: number }>(`/vibes/${vibeId}/sparkle`),

  // Users
  getUser: (username: string) =>
    get<{ user: import('./auth').User; vibes: Vibe[] }>(`/users/${username}`),

  // Daily vibe check
  getDailyVibeStatus: () => get<{ hasPostedToday: boolean; todaysVibe: Vibe | null }>('/vibes/daily-status'),
};
