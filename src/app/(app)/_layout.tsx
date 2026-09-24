import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { useFudsTheme } from '@/context/theme';

export default function AppLayout() {
  const { isSignedIn, isLoading } = useAuth();
  const { colors } = useFudsTheme();

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Redirect href={'/(auth)/login' as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="marketplace" options={{ headerShown: false }} />
      <Stack.Screen name="category/[group]" options={{ headerShown: false }} />
      <Stack.Screen name="schedule/pick-meal" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="support" options={{ headerShown: false }} />
      <Stack.Screen name="password-security" options={{ headerShown: false }} />
      <Stack.Screen name="payment-settings" options={{ headerShown: false }} />
      <Stack.Screen name="payment/[orderId]" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-permissions" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
