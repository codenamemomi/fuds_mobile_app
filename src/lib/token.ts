/**
 * SecureStore token helpers for JWT persistence.
 * Falls back to in-memory for web (expo-secure-store is native-only).
 */

import { Platform } from 'react-native';

const TOKEN_KEY = 'fuds_access_token';

// Web fallback — in-memory only (not persisted across reloads, acceptable for web dev)
let memoryToken: string | null = null;

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryToken = token;
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memoryToken;
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    memoryToken = null;
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
