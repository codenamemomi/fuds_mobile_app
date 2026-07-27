import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFudsTheme } from '@/context/theme';

export default function TabsLayout() {
  const { colors } = useFudsTheme();
  const insets = useSafeAreaInsets();

  const isIos = Platform.OS === 'ios';
  
  // Dynamically calculate padding and height using safe area insets to prevent overlap with device navigation bars
  const bottomPadding = isIos
    ? (insets.bottom > 0 ? insets.bottom - 6 : 20)
    : (insets.bottom > 0 ? insets.bottom + 6 : 10);
    
  const tabHeight = isIos
    ? (insets.bottom > 0 ? 56 + insets.bottom : 76)
    : (insets.bottom > 0 ? 56 + insets.bottom : 64);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          opacity: 1,
          height: tabHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
