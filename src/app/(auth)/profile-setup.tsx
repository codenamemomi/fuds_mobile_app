/**
 * Profile Setup Screen — Step 3 of 3
 * Name is taken from registration (read-only). Collects address + diet goal.
 * PUT /api/v1/auth/me → navigate to (app)
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AddressField } from '@/components/ui/address-field';
import { FudsButton } from '@/components/ui/fuds-button';
import { StepDots } from '@/components/ui/step-dots';
import { FudsColors, FudsRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

const DIET_GOALS = [
  'Weight Loss',
  'Weight Gain',
  'Keto',
  'Low Carb',
  'High Protein',
  'Vegan',
  'Vegetarian',
  'No Preference',
] as const;

type DietGoal = (typeof DIET_GOALS)[number];

export default function ProfileSetupScreen() {
  const { updateProfile, refreshUser, user } = useAuth();

  const displayName = user?.fullname?.trim() || '';
  const [address, setAddress] = useState(user?.address ?? '');
  const [dietGoal, setDietGoal] = useState<DietGoal | null>(null);
  const [loading, setLoading] = useState(false);

  // Ensure we have the latest user (name from registration) if context was empty
  useEffect(() => {
    if (!user?.fullname) {
      refreshUser();
    }
  }, [user?.fullname, refreshUser]);

  async function handleSave() {
    setLoading(true);
    try {
      // Do not send fullname — already set at registration and locked here
      await updateProfile({
        address: address.trim() || undefined,
        diet_goal: dietGoal ?? undefined,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Profile update failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <StepDots current={3} />
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>
              {displayName ? `Welcome, ${displayName.split(' ')[0]}!` : 'Complete Profile'}
            </Text>
            <Text style={styles.subtitle}>
              Add your delivery address and diet goal. Your name from registration is already
              saved.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Registration name — display only, not editable */}
            <View style={styles.nameBlock}>
              <Text style={styles.nameLabel}>FULL NAME</Text>
              <View style={styles.nameCard}>
                <View style={styles.nameIcon}>
                  <Ionicons name="person" size={18} color={FudsColors.primary} />
                </View>
                <View style={styles.nameTextCol}>
                  <Text style={styles.nameValue} numberOfLines={2}>
                    {displayName || 'Loading…'}
                  </Text>
                  <Text style={styles.nameHint}>Set when you registered · cannot be changed here</Text>
                </View>
                <Ionicons name="lock-closed" size={14} color={FudsColors.mutedForeground} />
              </View>
            </View>

            <AddressField
              label="Delivery Address"
              placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
              value={address}
              onChangeText={setAddress}
            />

            {/* Diet Goal chips */}
            <View style={styles.chipsSection}>
              <Text style={styles.chipsLabel}>DIET GOAL (SELECT ONE)</Text>
              <View style={styles.chipsGrid}>
                {DIET_GOALS.map((goal) => {
                  const isSelected = dietGoal === goal;
                  return (
                    <TouchableOpacity
                      key={goal}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setDietGoal(isSelected ? null : goal)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
                      >
                        {goal}
                      </Text>
                      {isSelected && <Text style={styles.chipCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.cta}>
            <FudsButton
              label="Save & Start Exploring →"
              loading={loading}
              onPress={handleSave}
            />
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: FudsColors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
  },
  headerLeft: { width: 40 },
  titleBlock: { gap: 8 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: FudsColors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: FudsColors.mutedForeground,
    lineHeight: 20,
  },
  form: { gap: Spacing.three },
  nameBlock: { gap: 6 },
  nameLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.foreground,
    letterSpacing: 1.2,
  },
  nameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: FudsColors.muted,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    borderRadius: FudsRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  nameIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameTextCol: { flex: 1, gap: 2 },
  nameValue: {
    fontSize: 15,
    fontWeight: '800',
    color: FudsColors.foreground,
  },
  nameHint: {
    fontSize: 11,
    color: FudsColors.mutedForeground,
    fontWeight: '600',
  },
  chipsSection: { gap: 10 },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.foreground,
    letterSpacing: 1.2,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: FudsRadius.md,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    backgroundColor: FudsColors.background,
  },
  chipSelected: {
    borderColor: FudsColors.primary,
    backgroundColor: 'rgba(29,158,117,0.1)',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: FudsColors.mutedForeground,
  },
  chipLabelSelected: {
    color: FudsColors.primary,
  },
  chipCheck: {
    fontSize: 12,
    color: FudsColors.primary,
    fontWeight: '700',
  },
  cta: { gap: Spacing.two },
  skipText: {
    textAlign: 'center',
    fontSize: 14,
    color: FudsColors.mutedForeground,
    paddingVertical: 8,
    textDecorationLine: 'underline',
  },
});
