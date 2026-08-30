import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/ui/floating-tab-bar';
import { useFudsTheme } from '@/context/theme';

export default function TabsLayout() {
  const { colors } = useFudsTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="schedule" options={{ title: '111' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
