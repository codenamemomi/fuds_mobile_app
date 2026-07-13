/**
 * Payment settings — Paystack info + recent order payment statuses.
 */

import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
import { useFudsTheme } from '@/context/theme';
import { ordersApi, type OrderRead } from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';

export default function PaymentSettingsScreen() {
  const { colors } = useFudsTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await ordersApi.listOrders();
      setOrders(data.slice(0, 8));
    } catch {
      setOrders([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
        <Text style={styles.topTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="card" size={22} color={colors.primary} />
          </View>
          <Text style={styles.introTitle}>How you pay on FUDS</Text>
          <Text style={styles.introSub}>
            Payments run through Paystack at checkout — card or bank transfer (Titan virtual
            account). We don&apos;t store card numbers on FUDS.
          </Text>
        </View>

        <View style={styles.card}>
          <InfoRow
            styles={styles}
            colors={colors}
            icon="phone-portrait-outline"
            title="Card checkout"
            body="Hosted Paystack page when you place an order."
          />
          <InfoRow
            styles={styles}
            colors={colors}
            icon="business-outline"
            title="Bank transfer (Titan)"
            body="Transfer the exact amount to your dedicated virtual account."
            last
          />
        </View>

        <Text style={styles.sectionLabel}>RECENT PAYMENT STATUS</Text>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: Spacing.four }} />
          ) : orders.length === 0 ? (
            <Text style={styles.empty}>No orders yet. Payment status appears after checkout.</Text>
          ) : (
            orders.map((o, i) => (
              <View
                key={o.id}
                style={[styles.orderRow, i === orders.length - 1 && styles.rowLast]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>Order #{o.id}</Text>
                  <Text style={styles.orderMeta}>
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'} · ₦
                    {Number(o.total_price).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{o.payment_status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push('/(app)/(tabs)/orders' as any)}
        >
          <Text style={styles.linkBtnText}>View all orders</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  styles,
  colors,
  icon,
  title,
  body,
  last,
}: {
  styles: ReturnType<typeof makeStyles>;
  colors: { primary: string };
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{body}</Text>
      </View>
    </View>
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
    topTitle: { fontSize: 17, fontWeight: '800', color: c.foreground },
    scroll: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
    intro: { gap: 6 },
    introIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    introTitle: { fontSize: 20, fontWeight: '900', color: c.foreground },
    introSub: { fontSize: 13, color: c.mutedForeground, lineHeight: 19 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.mutedForeground,
      letterSpacing: 1,
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
    infoRow: {
      flexDirection: 'row',
      gap: 12,
      padding: Spacing.three,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: { fontSize: 15, fontWeight: '800', color: c.foreground },
    rowSub: { fontSize: 12, color: c.mutedForeground, fontWeight: '600', marginTop: 2 },
    rowLast: { borderBottomWidth: 0 },
    empty: {
      padding: Spacing.four,
      textAlign: 'center',
      color: c.mutedForeground,
      fontSize: 13,
      fontWeight: '600',
    },
    orderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.three,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 10,
    },
    orderId: { fontSize: 14, fontWeight: '800', color: c.foreground },
    orderMeta: { fontSize: 12, color: c.mutedForeground, marginTop: 2, fontWeight: '600' },
    badge: {
      backgroundColor: c.openBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: FudsRadius.full,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: c.openText,
      textTransform: 'uppercase',
    },
    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.two,
    },
    linkBtnText: { fontSize: 14, fontWeight: '800', color: c.primary },
  });
}
