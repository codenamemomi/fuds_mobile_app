/**
 * FUDS API Client
 * Connects to the FastAPI backend at /api/v1/auth/*
 * Base URL is configured via app.json extras → Constants.expoConfig.extra.apiBaseUrl
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getToken } from './token';

const getApiBaseUrl = (): string => {
  // In development, dynamically determine the host computer's IP address.
  // This allows physical devices (connected over local Wi-Fi) to reach the backend.
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.15:8081"
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:8000`;
      }
    }
  }

  const configuredUrl = Constants.expoConfig?.extra?.apiBaseUrl as string;
  if (!configuredUrl) {
    return 'http://localhost:8000';
  }
  // Android emulator maps 10.0.2.2 to host's 127.0.0.1
  if (Platform.OS === 'android') {
    return configuredUrl;
  }
  // For iOS Simulator, Web, etc., map 10.0.2.2 back to localhost
  if (configuredUrl.includes('10.0.2.2')) {
    return configuredUrl.replace('10.0.2.2', 'localhost');
  }
  return configuredUrl;
};

const BASE_URL: string = getApiBaseUrl();
if (__DEV__) {
  console.log('[FUDS API] Resolved BASE_URL:', BASE_URL);
}

const API_PREFIX = '/api/v1';

// ─── Types (mirroring backend Pydantic schemas) ───────────────────────────────

export interface UserRead {
  id: number;
  fullname: string;
  phone: string;
  email: string | null;
  diet_goal: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  phone_verified: boolean;
}

export interface RegisterPayload {
  fullname: string;
  phone: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface UpdateProfilePayload {
  fullname?: string;
  phone?: string;
  email?: string;
  password?: string;
  diet_goal?: string;
  address?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserRead;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  // Handle 204 No Content
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyOtp: (payload: VerifyOtpPayload) =>
    request<{ message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resendOtp: (payload: ResendOtpPayload) =>
    request<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
      auth: true,
    }),

  getMe: () => request<UserRead>('/auth/me', { auth: true }),

  updateProfile: (payload: UpdateProfilePayload) =>
    request<UserRead>('/auth/me', {
      method: 'PUT',
      auth: true,
      body: JSON.stringify(payload),
    }),
};
