/**
 * Privacy & permissions — location status + open system settings.
 */

import * as Location from 'expo-location';
import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { useFocusEffect } from "expo-router/react-navigation";

import { FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
import { useFudsTheme } from '@/context/theme';
import { safeGoBack } from '@/lib/navigation';

function statusLabel(status: Location.PermissionStatus | null): string {
  if (!status) return 'Unknown';
  if (status === Location.PermissionStatus.GRANTED) return 'Granted';
  if (status === Location.PermissionStatus.DENIED) return 'Denied';
  return 'Not determined';
}

export default function PrivacyPermissionsScreen() {
  const { colors } = useFudsTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [locationStatus, setLocationStatus] = useState<Location.PermissionStatus | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await Location.getForegroundPermissionsAsync();
      setLocationStatus(res.status);
      setCanAskAgain(res.canAskAgain);
    } catch {
      setLocationStatus(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const requestLocation = async () => {
    await Location.requestForegroundPermissionsAsync();
    await refresh();
  };

  const openSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const locGranted = locationStatus === Location.PermissionStatus.GRANTED;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeGoBack('/(app)/settings')}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Privacy & permissions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lead}>
          FUDS only requests access that helps deliveries. You can change permissions anytime in
          your device settings.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Location</Text>
              <Text style={styles.rowSub}>
                Suggests a delivery address. You can always edit the text before saving.
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.badge,
                    locGranted ? styles.badgeOk : styles.badgeMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      locGranted ? styles.badgeTextOk : styles.badgeTextMuted,
                    ]}
                  >
                    {statusLabel(locationStatus)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            {canAskAgain && !locGranted ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={requestLocation}>
                <Text style={styles.primaryBtnText}>Allow location</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.secondaryBtn} onPress={openSystemSettings}>
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Open system settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowIcon}>
              <Ionicons name="shield-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Your data</Text>
              <Text style={styles.rowSub}>
                Account details and orders are stored on FUDS servers. Payments are processed by
                Paystack — we don&apos;t store full card numbers.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  openBg: string;
  openText: string;
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
    topTitle: { fontSize: 15, fontWeight: '800', color: c.foreground, maxWidth: 220 },
    scroll: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
    lead: { fontSize: 13, color: c.mutedForeground, lineHeight: 19, fontWeight: '600' },
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
      gap: 12,
      padding: Spacing.three,
    },
    rowLast: {},
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: { fontSize: 15, fontWeight: '800', color: c.foreground },
    rowSub: { fontSize: 12, color: c.mutedForeground, fontWeight: '600', marginTop: 4, lineHeight: 17 },
    statusRow: { marginTop: 10 },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: FudsRadius.full,
    },
    badgeOk: { backgroundColor: c.openBg },
    badgeMuted: { backgroundColor: c.muted },
    badgeText: { fontSize: 11, fontWeight: '800' },
    badgeTextOk: { color: c.openText },
    badgeTextMuted: { color: c.mutedForeground },
    actions: { padding: Spacing.three, paddingTop: 0, gap: 10 },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: FudsRadius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryBtnText: { color: c.primaryForeground, fontWeight: '800', fontSize: 14 },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: FudsRadius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingVertical: 12,
    },
    secondaryBtnText: { color: c.primary, fontWeight: '800', fontSize: 14 },
  });
}
