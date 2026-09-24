/**
 * Category vendor list — Food, Grocery, Shops, Pharmacy, Packages.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FALLBACK_CATEGORIES, getCategoryVisual } from '@/constants/browse';
import { FudsColors, FudsImages, FudsShadow, Spacing } from '@/constants/theme';
import { browseApi, isVendorOpen, type Vendor } from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';

function formatCategory(category: string | null | undefined): string {
  if (!category) return 'Store';
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatHours(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

function reopenLabel(vendor: Vendor): string {
  if (vendor.opening_time) return `Reopens at ${formatHours(vendor.opening_time)}`;
  return 'Currently closed';
}

export default function CategoryVendorsScreen() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  const groupKey = String(group ?? 'food');
  const meta = useMemo(
    () => FALLBACK_CATEGORIES.find((c) => c.key === groupKey) ?? FALLBACK_CATEGORIES[0],
    [groupKey]
  );
  const visual = getCategoryVisual(groupKey);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await browseApi.listVendors({ group: groupKey, limit: 60 });
      setVendors(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vendors');
    }
  }, [groupKey]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goToVendor = (vendorId: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/(app)/vendor/${vendorId}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.hero, { backgroundColor: visual.bg }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => safeGoBack('/(app)/(tabs)/')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={FudsColors.foreground} />
          </TouchableOpacity>
          <View style={[styles.heroIcon, { backgroundColor: '#fff' }]}>
            <Ionicons name={visual.icon} size={22} color={visual.tint} />
          </View>
        </View>
        <Text style={styles.title}>{meta.label}</Text>
        <Text style={styles.subtitle}>{meta.subtitle}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={FudsColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={36} color={FudsColors.mutedForeground} />
              <Text style={styles.emptyTitle}>No {meta.label.toLowerCase()} nearby</Text>
              <Text style={styles.emptyCopy}>Check back soon — vendors are joining FUDS.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const open = isVendorOpen(item);
            const cover =
              item.business_logo ||
              (item.browse_group === 'grocery' ||
              item.category === 'grocery_store' ||
              item.category === 'supermarket' ||
              item.category === 'local_market'
                ? FudsImages.groceries
                : FudsImages.jollof);
            return (
              <TouchableOpacity
                style={[styles.card, !open && styles.cardClosed]}
                activeOpacity={0.9}
                onPress={() => goToVendor(item.id)}
                disabled={!open}
              >
                <Image
                  source={{ uri: cover }}
                  style={[styles.cover, !open && styles.coverDim]}
                />
                {!open ? (
                  <View style={styles.closedOverlay}>
                    <Text style={styles.closedTitle}>Closed</Text>
                    <Text style={styles.closedSub}>{reopenLabel(item)}</Text>
                  </View>
                ) : (
                  <View style={styles.eta}>
                    <Text style={styles.etaText}>
                      {formatHours(item.opening_time)}–{formatHours(item.closing_time) || 'late'}
                    </Text>
                  </View>
                )}
                <View style={styles.meta}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.business_name}</Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {formatCategory(item.category)}
                      {item.address ? ` · ${item.address.split(',')[0]}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.status,
                      { backgroundColor: open ? FudsColors.openBg : FudsColors.muted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: open ? FudsColors.openText : FudsColors.mutedForeground },
                      ]}
                    >
                      {open ? 'OPEN' : 'CLOSED'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  hero: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 16, fontSize: 28, fontWeight: '900', color: FudsColors.foreground },
  subtitle: { marginTop: 4, fontSize: 14, fontWeight: '600', color: FudsColors.mutedForeground },
  error: {
    margin: Spacing.three,
    color: FudsColors.destructive,
    fontWeight: '700',
    fontSize: 13,
  },
  list: { padding: Spacing.three, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: FudsColors.foreground },
  emptyCopy: { fontSize: 13, fontWeight: '600', color: FudsColors.mutedForeground },
  card: {
    backgroundColor: FudsColors.card,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 14,
    ...FudsShadow.sm,
  },
  cardClosed: { opacity: 0.96 },
  cover: { width: '100%', height: 148, backgroundColor: FudsColors.muted },
  coverDim: { opacity: 0.55 },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  closedTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  closedSub: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 12, marginTop: 4 },
  eta: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(8,80,65,0.86)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  etaText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  name: { fontSize: 16, fontWeight: '900', color: FudsColors.foreground },
  sub: { marginTop: 2, fontSize: 12, fontWeight: '600', color: FudsColors.mutedForeground },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '900' },
});
