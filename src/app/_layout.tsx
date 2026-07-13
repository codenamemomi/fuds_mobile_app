/**
 * Root layout — Wraps the entire app with AuthProvider.
 * Expo Router picks up the route groups automatically:
 *   /(auth)/* — unauthenticated screens
 *   /(app)/*  — protected screens (guarded by (app)/_layout.tsx)
 */

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider } from '@/context/auth';
import { ThemeProvider } from '@/context/theme';
import { Slot } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </ThemeProvider>
  );
}
