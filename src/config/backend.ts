/**
 * FUDS backend URL configuration
 *
 * Dev (`expo start` / debug APK)  → local FastAPI
 * Prod (release / EAS preview)    → HTTPS reverse proxy
 *
 * For a physical phone on the same Wi-Fi as your laptop, set DEV_BACKEND_URL
 * to your machine LAN IP, e.g. 'http://192.168.1.42:8000'.
 * Leave it null to auto-use the Expo Metro host IP on port 8000.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Production — alwaysdata HTTPS reverse proxy. */
export const PROD_BACKEND_URL = 'https://omomi.alwaysdata.net';
export const LIVE_BACKEND_URL = PROD_BACKEND_URL;
export const PHYSICAL_DEVICE_BACKEND_URL = PROD_BACKEND_URL;

/**
 * Local FastAPI for development only.
 * Examples:
 *   'http://192.168.1.42:8000'   physical phone on the same Wi-Fi
 *   'http://10.0.2.2:8000'       Android emulator
 *   'http://localhost:8000'      iOS simulator / web
 *   null                         auto-detect (Expo host / emulator loopback)
 */
export const DEV_BACKEND_URL: string | null = null;

/** @deprecated Prefer DEV_BACKEND_URL / PROD_BACKEND_URL. */
export const EXPLICIT_BACKEND_URL: string | null = DEV_BACKEND_URL;

export const BACKEND_PORT = 8000;
export const API_PREFIX = '/api/v1';
export const ANDROID_EMULATOR_HOST = 'http://10.0.2.2:8000';
export const LOCALHOST_HOST = 'http://localhost:8000';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function fromEnv(): string | null {
  const envUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL
      ? process.env.EXPO_PUBLIC_API_BASE_URL.trim()
      : '';
  return envUrl ? stripTrailingSlash(envUrl) : null;
}

function fromAppJson(key: 'apiBaseUrl' | 'devApiBaseUrl'): string | null {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const value = typeof extra?.[key] === 'string' ? extra[key].trim() : '';
  return value ? stripTrailingSlash(value) : null;
}

function fromExpoDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const hostIp = hostUri.split(':')[0];
  if (!hostIp || hostIp === 'localhost' || hostIp === '127.0.0.1') return null;
  return `http://${hostIp}:${BACKEND_PORT}`;
}

function devDefault(): string {
  if (DEV_BACKEND_URL?.trim()) return stripTrailingSlash(DEV_BACKEND_URL.trim());
  const fromJson = fromAppJson('devApiBaseUrl');
  if (fromJson) return fromJson;
  return fromExpoDevHost() ?? (Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : LOCALHOST_HOST);
}

function prodDefault(): string {
  return fromAppJson('apiBaseUrl') ?? PROD_BACKEND_URL;
}

/**
 * Dev builds use local FastAPI. Release builds use the HTTPS proxy.
 * EXPO_PUBLIC_API_BASE_URL always wins (EAS profiles).
 */
export function getBackendUrl(): string {
  const fromPublicEnv = fromEnv();
  if (fromPublicEnv) return fromPublicEnv;
  return __DEV__ ? devDefault() : prodDefault();
}

export const BACKEND_URL: string = getBackendUrl();

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${API_PREFIX}${normalized}`;
}

if (__DEV__) {
  console.log('[FUDS config] mode:        DEV');
  console.log('[FUDS config] BACKEND_URL:', BACKEND_URL);
  console.log('[FUDS config] API base:   ', `${BACKEND_URL}${API_PREFIX}`);
}
