/**
 * (auth) layout — Stack navigator for all authentication screens.
 * Unauthenticated users land here; once signed in they're redirected to (app).
 */

import { Stack } from 'expo-router';

import { FudsColors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: FudsColors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
