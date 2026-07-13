/**
 * Safe navigation helpers for Expo Router.
 * router.back() throws a dev warning when the stack has no history
 * (e.g. after router.replace from splash, or a remounted Stack).
 */

import { router } from 'expo-router';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Href = any;

export function safeGoBack(fallback: Href = '/(app)/(tabs)/profile') {
  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // fall through to replace
  }
  router.replace(fallback);
}
