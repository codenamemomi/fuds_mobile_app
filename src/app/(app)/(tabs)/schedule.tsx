/**
 * Schedule with 111 — placeholder UI matching mockup brand language.
 */

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  BottomTabInset,
  FudsColors,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = BottomTabInset + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.inner, { paddingBottom: tabClearance }]}>
        <Text style={styles.pageTitle}>Schedule</Text>
        <Text style={styles.pageSub}>Priority slots with 111</Text>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar" size={32} color={FudsColors.primaryForeground} />
          </View>
          <Text style={styles.title}>Schedule with 111</Text>
          <Text style={styles.subtitle}>
            Lock breakfast, lunch, or dinner delivery windows ahead of peak demand in Lagos.
            Full scheduling lands next — the backend model is already in place.
          </Text>

          <View style={styles.featureList}>
            {['Breakfast · Lunch · Dinner', 'Priority delivery windows', 'Skip the peak-hour rush'].map(
              (line) => (
                <View key={line} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={FudsColors.primary} />
                  <Text style={styles.featureText}>{line}</Text>
                </View>
              )
            )}
          </View>

          <View style={styles.soonPill}>
            <Text style={styles.soonText}>Coming soon</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  inner: { flex: 1, padding: Spacing.three },
  pageTitle: { fontSize: 22, fontWeight: '800', color: FudsColors.foreground },
  pageSub: {
    fontSize: 13,
    color: FudsColors.mutedForeground,
    marginTop: 4,
    marginBottom: Spacing.four,
    fontWeight: '600',
  },
  card: {
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.four,
    alignItems: 'center',
    ...FudsShadow.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  title: { fontSize: 18, fontWeight: '800', color: FudsColors.foreground, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: FudsColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.two,
  },
  featureList: { width: '100%', marginTop: Spacing.four, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, fontWeight: '700', color: FudsColors.foreground },
  soonPill: {
    marginTop: Spacing.four,
    backgroundColor: FudsColors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  soonText: { fontSize: 12, fontWeight: '800', color: FudsColors.primary },
});
