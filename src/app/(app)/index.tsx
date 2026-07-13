/**
 * Home Screen (placeholder)
 * Protected — only reachable when signed in.
 * Shows welcome message and a sign-out button.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FudsButton } from '@/components/ui/fuds-button';
import { FudsColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🥘</Text>
          </View>
          <Text style={styles.brandName}>FUDS</Text>
        </View>

        {/* Welcome card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.greeting}>
            Welcome back,{'\n'}
            <Text style={styles.username}>{user?.fullname ?? 'Foodie'} 👋</Text>
          </Text>
          {user?.address && (
            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {user.address}
              </Text>
            </View>
          )}
          {user?.diet_goal && (
            <View style={styles.goalChip}>
              <Text style={styles.goalText}>🎯 {user.diet_goal}</Text>
            </View>
          )}
        </View>

        {/* Coming soon */}
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonIcon}>🚀</Text>
          <Text style={styles.comingSoonTitle}>App Coming Soon</Text>
          <Text style={styles.comingSoonSubtitle}>
            Auth is fully connected. More screens are on the way.
          </Text>
        </View>

        <FudsButton label="Sign Out" variant="ghost" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FudsColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: Spacing.four,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: FudsColors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FudsColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  logoEmoji: { fontSize: 30 },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    color: FudsColors.foreground,
    letterSpacing: 4,
  },
  welcomeCard: {
    backgroundColor: FudsColors.card,
    borderRadius: 20,
    padding: Spacing.four,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  greeting: {
    fontSize: 18,
    color: FudsColors.foreground,
    lineHeight: 28,
  },
  username: {
    fontWeight: '700',
    color: FudsColors.primary,
    fontSize: 22,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressIcon: { fontSize: 14 },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: FudsColors.mutedForeground,
  },
  goalChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29,158,117,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goalText: {
    fontSize: 13,
    color: FudsColors.primary,
    fontWeight: '600',
  },
  comingSoon: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.four,
  },
  comingSoonIcon: { fontSize: 40 },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: FudsColors.foreground,
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
});
