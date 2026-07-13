import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { FudsColors } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function AppLayout() {
  const { isSignedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={FudsColors.primary} />
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
        contentStyle: { backgroundColor: FudsColors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="vendor/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: FudsColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});