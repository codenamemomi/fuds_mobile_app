/**
 * Profile — view + edit via PUT /api/v1/auth/me
 * Password changes live under Settings.
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AddressField } from '@/components/ui/address-field';
import { FudsButton } from '@/components/ui/fuds-button';
import { FudsInput } from '@/components/ui/fuds-input';
import { KeyboardScreen } from '@/components/ui/keyboard-screen';
import { FudsColors, FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
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

/** Strip +234 / 234 / leading 0 for the local input field */
function toLocalPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export default function ProfileScreen() {
  const { user, updateProfile, refreshUser, signOut } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullname, setFullname] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dietGoal, setDietGoal] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hydrateFromUser = useCallback(() => {
    if (!user) return;
    setFullname(user.fullname ?? '');
    setPhoneLocal(toLocalPhone(user.phone));
    setEmail(user.email ?? '');
    setAddress(user.address ?? '');
    setDietGoal(user.diet_goal ?? null);
    setFieldErrors({});
    setError(null);
  }, [user]);

  useEffect(() => {
    if (!editing) {
      hydrateFromUser();
    }
  }, [user, editing, hydrateFromUser]);

  // Refresh from API when tab is focused (unless mid-edit)
  useFocusEffect(
    useCallback(() => {
      if (editing) return;
      refreshUser();
    }, [editing, refreshUser])
  );

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (fullname.trim().length > 0 && fullname.trim().length < 2) {
      errs.fullname = 'Name must be at least 2 characters';
    }
    const digits = phoneLocal.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 7) {
      errs.phone = 'Enter a valid phone number';
    }
    if (email.trim().length > 0 && !email.includes('@')) {
      errs.email = 'Enter a valid email';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      const payload: {
        fullname?: string;
        phone?: string;
        email?: string;
        address?: string;
        diet_goal?: string;
      } = {};

      const nextName = fullname.trim();
      if (nextName && nextName !== (user?.fullname ?? '')) {
        payload.fullname = nextName;
      }

      const nextPhone = phoneLocal.replace(/\D/g, '');
      const currentLocal = toLocalPhone(user?.phone);
      if (nextPhone && nextPhone !== currentLocal) {
        // Backend format_phone_number → +234…
        payload.phone = nextPhone.startsWith('0') ? nextPhone : `0${nextPhone}`;
      }

      const nextEmail = email.trim();
      if (nextEmail && nextEmail !== (user?.email ?? '')) {
        payload.email = nextEmail;
      }

      const nextAddress = address.trim();
      if (nextAddress !== (user?.address ?? '').trim()) {
        payload.address = nextAddress;
      }

      const nextDiet = (dietGoal ?? '').trim();
      if (nextDiet !== (user?.diet_goal ?? '').trim()) {
        payload.diet_goal = nextDiet;
      }

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      await updateProfile(payload, { navigate: false });
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not update profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    hydrateFromUser();
    setEditing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardScreen contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Profile</Text>
            <View style={styles.titleActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  router.push('/settings' as any);
                }}
                activeOpacity={0.85}
                hitSlop={8}
              >
                <Ionicons name="settings-outline" size={20} color={FudsColors.foreground} />
              </TouchableOpacity>
              {!editing ? (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => {
                    hydrateFromUser();
                    setEditing(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color={FudsColors.primary} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleCancel} hitSlop={8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Hero */}
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

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={FudsColors.destructive} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {!editing ? (
            <View style={styles.card}>
              <ProfileRow icon="person-outline" label="Name" value={user?.fullname ?? '—'} />
              <ProfileRow icon="mail-outline" label="Email" value={user?.email ?? '—'} />
              <ProfileRow icon="call-outline" label="Phone" value={user?.phone ?? '—'} />
              <ProfileRow
                icon="location-outline"
                label="Address"
                value={user?.address ?? 'Not set'}
              />
              <ProfileRow
                icon="flag-outline"
                label="Diet Goal"
                value={user?.diet_goal ?? 'Not set'}
                last
              />
            </View>
          ) : (
            <View style={styles.formCard}>
              <FudsInput
                label="Full name"
                placeholder="e.g. Tunde Alao"
                autoCapitalize="words"
                value={fullname}
                onChangeText={setFullname}
                error={fieldErrors.fullname}
                leftContent={<Text style={styles.emoji}>👤</Text>}
              />

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                <View
                  style={[styles.phoneRow, !!fieldErrors.phone && styles.phoneRowError]}
                >
                  <View style={styles.dialCode}>
                    <Text style={styles.flag}>🇳🇬</Text>
                    <Text style={styles.dialCodeText}>+234</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="8012345678"
                    placeholderTextColor={FudsColors.mutedForeground}
                    keyboardType="phone-pad"
                    value={phoneLocal}
                    onChangeText={(t) => setPhoneLocal(t.replace(/\D/g, '').slice(0, 11))}
                  />
                </View>
                {fieldErrors.phone ? (
                  <Text style={styles.fieldError}>{fieldErrors.phone}</Text>
                ) : null}
                <Text style={styles.hint}>
                  Changing phone may require re-verification on next login.
                </Text>
              </View>

              <FudsInput
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
                leftContent={<Text style={styles.emoji}>✉️</Text>}
              />

              <AddressField
                label="Delivery address"
                value={address}
                onChangeText={setAddress}
                placeholder="Street, estate / landmark, area"
              />

              <View style={styles.chipsSection}>
                <Text style={styles.chipsLabel}>DIET GOAL</Text>
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
                        {isSelected ? <Text style={styles.chipCheck}>✓</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <FudsButton
                label="Save changes"
                loading={saving}
                onPress={handleSave}
                style={{ marginTop: Spacing.two }}
              />
            </View>
          )}

          {/* Settings entry (also in header) */}
          {!editing && (
            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.88}
              onPress={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                router.push('/settings' as any);
              }}
            >
              <View style={styles.settingsIcon}>
                <Ionicons name="settings-outline" size={20} color={FudsColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsTitle}>Settings</Text>
                <Text style={styles.settingsSub}>Password, security &amp; more</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={FudsColors.mutedForeground} />
            </TouchableOpacity>
          )}

          <FudsButton
            label="Sign Out"
            variant="ghost"
            onPress={() => {
              Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
              ]);
            }}
            style={{ marginTop: Spacing.four }}
          />
      </KeyboardScreen>
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
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: FudsColors.foreground,
  },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(29,158,117,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: FudsRadius.full,
  },
  editBtnText: { fontSize: 13, fontWeight: '800', color: FudsColors.primary },
  cancelText: { fontSize: 14, fontWeight: '700', color: FudsColors.mutedForeground },
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    backgroundColor: '#FEF2F2',
    borderRadius: FudsRadius.md,
  },
  errorBannerText: { flex: 1, color: FudsColors.destructive, fontSize: 12, fontWeight: '600' },
  card: {
    width: '100%',
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  formCard: {
    width: '100%',
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    gap: Spacing.three,
    ...FudsShadow.sm,
  },
  emoji: { fontSize: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.foreground,
    letterSpacing: 1.2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FudsColors.background,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    borderRadius: FudsRadius.md,
    overflow: 'hidden',
  },
  phoneRowError: { borderColor: FudsColors.destructive },
  dialCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: FudsColors.muted,
    borderRightWidth: 1,
    borderRightColor: FudsColors.border,
  },
  flag: { fontSize: 16 },
  dialCodeText: { fontWeight: '800', color: FudsColors.foreground, fontSize: 14 },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    color: FudsColors.foreground,
  },
  fieldError: { fontSize: 12, color: FudsColors.destructive, fontWeight: '500' },
  hint: { fontSize: 11, color: FudsColors.mutedForeground, lineHeight: 15 },
  chipsSection: { gap: 10 },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.foreground,
    letterSpacing: 1.2,
  },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  chipLabelSelected: { color: FudsColors.primary },
  chipCheck: { fontSize: 12, color: FudsColors.primary, fontWeight: '700' },
  settingsRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    ...FudsShadow.sm,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: { fontSize: 15, fontWeight: '800', color: FudsColors.foreground },
  settingsSub: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 2, fontWeight: '600' },
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
