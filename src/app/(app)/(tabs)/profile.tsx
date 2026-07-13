/**
 * Profile — mockup-aligned card layout with safe tab clearance.
 */

import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { FudsButton } from '@/components/ui/fuds-button';
import {
  BottomTabInset,
  FudsColors,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const tabClearance = BottomTabInset + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabClearance + Spacing.four }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.heroCard}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={36} color={FudsColors.primaryForeground} />
          </View>
          <Text style={styles.name}>{user?.fullname ?? 'Foodie'}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          {user?.phone_verified ? (
            <View style={styles.verifiedPill}>
              <Ionicons name="checkmark-circle" size={14} color={FudsColors.openText} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <View style={[styles.verifiedPill, styles.unverifiedPill]}>
              <Ionicons name="alert-circle" size={14} color={FudsColors.destructive} />
              <Text style={[styles.verifiedText, { color: FudsColors.destructive }]}>
                Not verified
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <ProfileRow icon="mail-outline" label="Email" value={user?.email ?? '—'} />
          <ProfileRow icon="location-outline" label="Address" value={user?.address ?? 'Not set'} />
          <ProfileRow icon="flag-outline" label="Diet Goal" value={user?.diet_goal ?? 'Not set'} />
          <ProfileRow
            icon="shield-checkmark-outline"
            label="Phone"
            value={user?.phone_verified ? 'Verified' : 'Pending'}
            last
          />
        </View>

        <FudsButton
          label="Sign Out"
          variant="ghost"
          onPress={signOut}
          style={{ marginTop: Spacing.four }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={FudsColors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  content: { padding: Spacing.three },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: FudsColors.foreground,
    marginBottom: Spacing.three,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    ...FudsShadow.sm,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  name: { fontSize: 20, fontWeight: '800', color: FudsColors.foreground },
  phone: { fontSize: 13, color: FudsColors.mutedForeground, marginTop: 4, fontWeight: '600' },
  verifiedPill: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FudsColors.openBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  unverifiedPill: { backgroundColor: '#FEF2F2' },
  verifiedText: { fontSize: 11, fontWeight: '800', color: FudsColors.openText },
  card: {
    width: '100%',
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: FudsColors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 13, color: FudsColors.mutedForeground, width: 72, fontWeight: '600' },
  rowValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: FudsColors.foreground,
    textAlign: 'right',
  },
});
