/**
 * Settings hub — Account, App, Payment, Privacy, Support & Legal.
 */

import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL,
  SUPPORT_SUBJECT,
  TERMS_URL,
} from '@/constants/legal';
import { FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
import { useFudsTheme, type ThemePreference } from '@/context/theme';
import { safeGoBack } from '@/lib/navigation';

type RowItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Right-side label instead of chevron (e.g. version) */
  trailing?: string;
  chevron?: boolean;
};

function appVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode != null
        ? String(Constants.expoConfig.android.versionCode)
        : Constants.nativeBuildVersion;
  return build ? `${version} (${build})` : version;
}

export default function SettingsScreen() {
  const { colors, preference, setPreference, scheme } = useFudsTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const openMail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert('Contact support', `Email us at ${SUPPORT_EMAIL}`);
    } catch {
      Alert.alert('Contact support', `Email us at ${SUPPORT_EMAIL}`);
    }
  };

  const openWeb = async (url: string, title: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(title, url);
    }
  };

  const rateApp = async () => {
    const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    if (!url) {
      Alert.alert('Rate FUDS', 'Store listing will be available when the app is published.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Rate FUDS', 'Could not open the store.');
    }
  };

  const accountItems: RowItem[] = [
    {
      key: 'password-security',
      title: 'Password & security',
      subtitle: 'Change password and protect your account',
      icon: 'shield-checkmark-outline',
      chevron: true,
      onPress: () => router.push('/password-security' as any),
    },
  ];

  const paymentItems: RowItem[] = [
    {
      key: 'payment',
      title: 'Payment',
      subtitle: 'Paystack checkout & transfer info',
      icon: 'card-outline',
      chevron: true,
      onPress: () => router.push('/payment-settings' as any),
    },
  ];

  const privacyItems: RowItem[] = [
    {
      key: 'privacy',
      title: 'Privacy & permissions',
      subtitle: 'Location and system access',
      icon: 'lock-closed-outline',
      chevron: true,
      onPress: () => router.push('/privacy-permissions' as any),
    },
  ];

  const supportItems: RowItem[] = [
    {
      key: 'help',
      title: 'Help center / contact support',
      subtitle: SUPPORT_EMAIL,
      icon: 'help-buoy-outline',
      chevron: true,
      onPress: openMail,
    },
    {
      key: 'terms',
      title: 'Terms of service',
      subtitle: 'How you can use FUDS',
      icon: 'document-text-outline',
      chevron: true,
      onPress: () => openWeb(TERMS_URL, 'Terms of service'),
    },
    {
      key: 'privacy-policy',
      title: 'Privacy policy',
      subtitle: 'How we handle your data',
      icon: 'eye-outline',
      chevron: true,
      onPress: () => openWeb(PRIVACY_URL, 'Privacy policy'),
    },
    {
      key: 'rate',
      title: 'Rate the app',
      subtitle: 'Tell us what you think',
      icon: 'star-outline',
      chevron: true,
      onPress: rateApp,
    },
  ];

  const themeOptions: { key: ThemePreference; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeGoBack('/(app)/(tabs)/profile')}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section label="ACCOUNT" styles={styles} colors={colors} items={accountItems} />

        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.card}>
          <View style={styles.themeBlock}>
            <View style={styles.rowIcon}>
              <Ionicons name="moon-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Theme</Text>
              <Text style={styles.rowSub}>
                {preference === 'system'
                  ? `Following system (${scheme})`
                  : preference === 'dark'
                    ? 'Dark'
                    : 'Light'}
              </Text>
              <View style={styles.themeChips}>
                {themeOptions.map((opt) => {
                  const active = preference === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.themeChip, active && styles.themeChipActive]}
                      onPress={() => setPreference(opt.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowIcon}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>App version</Text>
              <Text style={styles.rowSub}>Build for support tickets</Text>
            </View>
            <Text style={styles.trailing}>{appVersionLabel()}</Text>
          </View>
        </View>

        <Section label="PAYMENT" styles={styles} colors={colors} items={paymentItems} />
        <Section
          label="PRIVACY & PERMISSIONS"
          styles={styles}
          colors={colors}
          items={privacyItems}
        />
        <Section label="SUPPORT & LEGAL" styles={styles} colors={colors} items={supportItems} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  label,
  items,
  styles,
  colors,
}: {
  label: string;
  items: RowItem[];
  styles: ReturnType<typeof makeStyles>;
  colors: { primary: string; mutedForeground: string };
}) {
  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.row, index === items.length - 1 && styles.rowLast]}
            onPress={item.onPress}
            activeOpacity={item.onPress ? 0.85 : 1}
            disabled={!item.onPress}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            {item.trailing ? (
              <Text style={styles.trailing}>{item.trailing}</Text>
            ) : item.chevron !== false ? (
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

function makeStyles(c: {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
}) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.two,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    topTitle: { fontSize: 17, fontWeight: '800', color: c.foreground },
    scroll: { padding: Spacing.three, paddingBottom: Spacing.six },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.mutedForeground,
      letterSpacing: 1,
      marginBottom: Spacing.two,
      marginTop: Spacing.three,
      marginLeft: 4,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: FudsRadius.xl,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      ...FudsShadow.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: '800', color: c.foreground },
    rowSub: { fontSize: 12, color: c.mutedForeground, fontWeight: '600' },
    trailing: { fontSize: 12, fontWeight: '700', color: c.mutedForeground },
    themeBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    themeChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    themeChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: FudsRadius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    themeChipActive: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    themeChipText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.mutedForeground,
    },
    themeChipTextActive: {
      color: c.primaryForeground,
    },
  });
}
