/**
 * FUDS backend URL configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Single place to point the mobile app at your FastAPI server.
 *
 * Resolution order (first match wins):
 *   1. EXPLICIT_BACKEND_URL  — set this for a fixed host (LAN IP, staging, prod)
 *   2. Expo dev host IP      — in __DEV__, reuses the Metro machine IP on :8000
 *   3. app.json → expo.extra.apiBaseUrl
 *   4. Platform fallbacks    — Android emulator 10.0.2.2, else localhost
 *
 * Examples:
 *   EXPLICIT_BACKEND_URL = 'http://192.168.1.42:8000'   // phone on same Wi‑Fi
 *   EXPLICIT_BACKEND_URL = 'https://api.fuds.app'       // production
 *   EXPLICIT_BACKEND_URL = null                        // auto (dev-friendly)
 *
 * Backend routes live under API_PREFIX (default /api/v1).
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Edit this when you need a fixed backend ─────────────────────────────────

/**
 * Set to a full origin (no trailing slash), e.g. `http://192.168.0.15:8000`.
 * Leave `null` to use Expo host / app.json / defaults.
 */
export const EXPLICIT_BACKEND_URL: string | null = "http://192.168.1.102:8000";

/** Port used when deriving the URL from the Expo dev host. */
export const BACKEND_PORT = 8000;

/** API path prefix on the FastAPI app (must match backend router mount). */
export const API_PREFIX = '/api/v1';

/** Fallback for Android emulator → host machine loopback. */
export const ANDROID_EMULATOR_HOST = 'http://10.0.2.2:8000';

/** Fallback for iOS simulator / web. */
export const LOCALHOST_HOST = 'http://localhost:8000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function fromExpoDevHost(): string | null {
  if (!__DEV__) return null;
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.15:8081"
  if (!hostUri) return null;
  const hostIp = hostUri.split(':')[0];
  if (!hostIp || hostIp === 'localhost' || hostIp === '127.0.0.1') return null;
  return `http://${hostIp}:${BACKEND_PORT}`;
}

function fromAppJsonExtra(): string | null {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (!configured?.trim()) return null;
  let url = stripTrailingSlash(configured.trim());
  // app.json often stores the Android emulator address; rewrite for iOS/web
  if (Platform.OS !== 'android' && url.includes('10.0.2.2')) {
    url = url.replace('10.0.2.2', 'localhost');
  }
  return url;
}

function platformDefault(): string {
  return Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : LOCALHOST_HOST;
}

/**
 * Resolve the backend origin (scheme + host + port, no /api path).
 * Safe to call once at module load or anytime.
 */
export function getBackendUrl(): string {
  if (EXPLICIT_BACKEND_URL?.trim()) {
    return stripTrailingSlash(EXPLICIT_BACKEND_URL.trim());
  }
  return fromExpoDevHost() ?? fromAppJsonExtra() ?? platformDefault();
}

/** Resolved once when the app module graph loads. */
export const BACKEND_URL: string = getBackendUrl();

/**
 * Build a full API URL for a path under /api/v1.
 * @example apiUrl('/auth/login') → 'http://192.168.1.15:8000/api/v1/auth/login'
 * @example apiUrl('orders')     → '…/api/v1/orders'
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${API_PREFIX}${normalized}`;
}

if (__DEV__) {
  console.log('[FUDS config] BACKEND_URL:', BACKEND_URL);
  console.log('[FUDS config] API base:   ', `${BACKEND_URL}${API_PREFIX}`);
}
