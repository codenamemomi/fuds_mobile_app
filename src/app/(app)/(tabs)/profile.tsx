/**
 * Profile — Chowdeck / Glovo-style account hub.
 * View: greeting, shortcuts, grouped rows. Edit stays a dedicated form.
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
import { useFocusEffect } from 'expo-router/react-navigation';

import { AddressField } from '@/components/ui/address-field';
import { FudsButton } from '@/components/ui/fuds-button';
import { FudsInput } from '@/components/ui/fuds-input';
import { KeyboardScreen } from '@/components/ui/keyboard-screen';
import { BottomTabInset, FudsColors, FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
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

function toLocalPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function firstName(fullname: string | null | undefined): string {
  const name = (fullname ?? '').trim();
  if (!name) return 'Foodie';
  return name.split(/\s+/)[0];
}

function initials(fullname: string | null | undefined): string {
  const parts = (fullname ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'F';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
    if (!editing) hydrateFromUser();
  }, [user, editing, hydrateFromUser]);

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
      if (nextName && nextName !== (user?.fullname ?? '')) payload.fullname = nextName;

      const nextPhone = phoneLocal.replace(/\D/g, '');
      const currentLocal = toLocalPhone(user?.phone);
      if (nextPhone && nextPhone !== currentLocal) {
        payload.phone = nextPhone.startsWith('0') ? nextPhone : `0${nextPhone}`;
      }

      const nextEmail = email.trim();
      if (nextEmail && nextEmail !== (user?.email ?? '')) payload.email = nextEmail;

      const nextAddress = address.trim();
      if (nextAddress !== (user?.address ?? '').trim()) payload.address = nextAddress;

      const nextDiet = (dietGoal ?? '').trim();
      if (nextDiet !== (user?.diet_goal ?? '').trim()) payload.diet_goal = nextDiet;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      await updateProfile(payload, { navigate: false });
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    hydrateFromUser();
    setEditing(false);
  }

  const go = (path: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(path as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardScreen contentContainerStyle={styles.content}>
        {editing ? (
          <>
            <View style={styles.editHeader}>
              <TouchableOpacity onPress={handleCancel} hitSlop={8} style={styles.backChip}>
                <Ionicons name="chevron-back" size={20} color={FudsColors.foreground} />
              </TouchableOpacity>
              <Text style={styles.editTitle}>Edit profile</Text>
              <View style={{ width: 36 }} />
            </View>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={FudsColors.destructive} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.formCard}>
              <FudsInput
                label="Full name"
                placeholder="e.g. Tunde Alao"
                autoCapitalize="words"
                value={fullname}
                onChangeText={setFullname}
                error={fieldErrors.fullname}
              />
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                <View style={[styles.phoneRow, !!fieldErrors.phone && styles.phoneRowError]}>
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
                {fieldErrors.phone ? <Text style={styles.fieldError}>{fieldErrors.phone}</Text> : null}
              </View>
              <FudsInput
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
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
                        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                          {goal}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <FudsButton label="Save changes" loading={saving} onPress={handleSave} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <Text style={styles.kicker}>YOUR ACCOUNT</Text>
                <TouchableOpacity style={styles.settingsOrb} onPress={() => go('/support')} hitSlop={8}>
                  <Ionicons name="headset-outline" size={18} color={FudsColors.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.identity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetters}>{initials(user?.fullname)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hello}>Hey, {firstName(user?.fullname)} 👋</Text>
                  <Text style={styles.phoneLine}>{user?.phone ?? 'Add your number'}</Text>
                  <View style={styles.badgeRow}>
                    {user?.phone_verified ? (
                      <View style={styles.badge}>
                        <Ionicons name="shield-checkmark" size={12} color={FudsColors.openText} />
                        <Text style={styles.badgeText}>Verified</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeWarn]}>
                        <Ionicons name="alert-circle" size={12} color={FudsColors.destructive} />
                        <Text style={[styles.badgeText, { color: FudsColors.destructive }]}>Unverified</Text>
                      </View>
                    )}
                    {user?.diet_goal ? (
                      <View style={styles.badgeDiet}>
                        <Ionicons name="leaf" size={12} color={FudsColors.primary} />
                        <Text style={styles.badgeDietText}>{user.diet_goal}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addressCard}
              activeOpacity={0.88}
              onPress={() => {
                hydrateFromUser();
                setEditing(true);
              }}
            >
              <View style={styles.pin}>
                <Ionicons name="navigate" size={16} color={FudsColors.primaryForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>Deliver to</Text>
                <Text style={styles.addressValue} numberOfLines={2}>
                  {user?.address?.trim() || 'Add a delivery address'}
                </Text>
              </View>
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <MenuRow
                icon="person-outline"
                title="Personal details"
                subtitle={user?.fullname || 'Name, email, phone'}
                onPress={() => {
                  hydrateFromUser();
                  setEditing(true);
                }}
              />
              <MenuRow
                icon="flag-outline"
                title="Diet goal"
                subtitle={user?.diet_goal || 'Tell us how you like to eat'}
                onPress={() => {
                  hydrateFromUser();
                  setEditing(true);
                }}
              />
              <MenuRow
                icon="lock-closed-outline"
                title="Password & security"
                subtitle="Update your login details"
                onPress={() => go('/password-security')}
              />
              <MenuRow
                icon="settings-outline"
                title="Settings"
                subtitle="Theme, notifications, app"
                onPress={() => go('/settings')}
                last
              />
            </View>

            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.menuCard}>
              <MenuRow
                icon="help-buoy-outline"
                title="Help centre"
                subtitle="Orders, refunds, and FAQs"
                onPress={() => go('/support')}
              />
              <MenuRow
                icon="shield-outline"
                title="Privacy"
                subtitle="How we use your data"
                onPress={() => go('/privacy-permissions')}
                last
              />
            </View>

            <TouchableOpacity
              style={styles.signOut}
              activeOpacity={0.85}
              onPress={() => {
                Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={FudsColors.destructive} />
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardScreen>
    </SafeAreaView>
  );
}

function Shortcut({
  icon,
  tint,
  color,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shortcut} onPress={onPress} activeOpacity={0.86}>
      <View style={[styles.shortcutIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, last && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={FudsColors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={FudsColors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  content: { paddingBottom: BottomTabInset + Spacing.five },
  hero: {
    backgroundColor: FudsColors.primary,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  settingsOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: Spacing.three },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: FudsColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarLetters: { fontSize: 24, fontWeight: '900', color: FudsColors.foreground },
  hello: { fontSize: 22, fontWeight: '900', color: '#fff' },
  phoneLine: { marginTop: 3, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FudsColors.openBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeWarn: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 11, fontWeight: '800', color: FudsColors.openText },
  badgeDiet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDietText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  addressCard: {
    marginTop: -18,
    marginHorizontal: Spacing.three,
    backgroundColor: FudsColors.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...FudsShadow.md,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: { fontSize: 11, fontWeight: '800', color: FudsColors.mutedForeground },
  addressValue: { marginTop: 2, fontSize: 13, fontWeight: '800', color: FudsColors.foreground },
  changeLink: { fontSize: 12, fontWeight: '800', color: FudsColors.primary },
  shortcuts: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    gap: 8,
  },
  shortcut: {
    flex: 1,
    backgroundColor: FudsColors.card,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    ...FudsShadow.sm,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: { fontSize: 11, fontWeight: '800', color: FudsColors.foreground },
  sectionTitle: {
    marginTop: Spacing.four,
    marginBottom: 8,
    marginHorizontal: Spacing.three,
    fontSize: 13,
    fontWeight: '800',
    color: FudsColors.mutedForeground,
    letterSpacing: 0.4,
  },
  menuCard: {
    marginHorizontal: Spacing.three,
    backgroundColor: FudsColors.card,
    borderRadius: 18,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FudsColors.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontSize: 14, fontWeight: '800', color: FudsColors.foreground },
  menuSub: { marginTop: 2, fontSize: 12, fontWeight: '600', color: FudsColors.mutedForeground },
  signOut: {
    marginTop: Spacing.four,
    marginHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  signOutText: { fontSize: 15, fontWeight: '800', color: FudsColors.destructive },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  backChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: FudsColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTitle: { fontSize: 18, fontWeight: '900', color: FudsColors.foreground },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    backgroundColor: '#FEF2F2',
    borderRadius: FudsRadius.md,
  },
  errorBannerText: { flex: 1, color: FudsColors.destructive, fontSize: 12, fontWeight: '600' },
  formCard: {
    marginHorizontal: Spacing.three,
    backgroundColor: FudsColors.card,
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.three,
    ...FudsShadow.sm,
  },
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
  chipsSection: { gap: 10 },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.foreground,
    letterSpacing: 1.2,
  },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    backgroundColor: FudsColors.background,
  },
  chipSelected: {
    borderColor: FudsColors.primary,
    backgroundColor: 'rgba(29,158,117,0.1)',
  },
  chipLabel: { fontSize: 13, fontWeight: '700', color: FudsColors.mutedForeground },
  chipLabelSelected: { color: FudsColors.primary },
});
