/**
 * Root layout — Wraps the entire app with AuthProvider.
 * Expo Router picks up the route groups automatically:
 *   /(auth)/* — unauthenticated screens
 *   /(app)/*  — protected screens (guarded by (app)/_layout.tsx)
 */

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AuthProvider } from '@/context/auth';
import { ThemeProvider } from '@/context/theme';
import { Slot } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <KeyboardProvider>
      <ThemeProvider>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
}