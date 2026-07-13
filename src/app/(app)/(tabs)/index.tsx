/**
 * Home Screen — UI aligned with FUDS Food Delivery App mockups.
 * Vendor data from GET /browse/vendors.
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { browseApi, isVendorOpen, type Vendor } from '@/lib/api';
import {
  BottomTabInset,
  FudsColors,
  FudsImages,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/context/auth';

function formatCategory(category: string | null): string {
  if (!category) return 'Vendor';
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatHours(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabClearance = BottomTabInset + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'restaurant' | 'grocery_store'>('all');

  const loadVendors = useCallback(async (category?: string) => {
    try {
      setError(null);
      const data = await browseApi.listVendors(
        category && category !== 'all' ? { category } : undefined
      );
      setVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vendors');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadVendors(activeFilter);
      setLoading(false);
    })();
  }, [loadVendors, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVendors(activeFilter);
    setRefreshing(false);
  }, [loadVendors, activeFilter]);

  const goToVendor = (vendorId: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/(app)/vendor/${vendorId}` as any);
  };

  const dietLabel = user?.diet_goal?.trim() || null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={vendors}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={FudsColors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: tabClearance + Spacing.four }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Sticky-style location header */}
            <View style={styles.topBar}>
              <View style={styles.locationRow}>
                <View style={styles.pinCircle}>
                  <Ionicons name="location" size={18} color={FudsColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveringLabel}>DELIVERING TO</Text>
                  <View style={styles.addressRow}>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {user?.address ?? 'Set your address in Profile'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={FudsColors.primary} />
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.bellButton} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={20} color={FudsColors.foreground} />
                <View style={styles.bellDot} />
              </TouchableOpacity>
            </View>

            {/* High demand banner — mockup tertiary dark card */}
            <View style={styles.banner}>
              <View style={styles.bannerIconBox}>
                <Ionicons name="time-outline" size={20} color={FudsColors.primaryForeground} />
              </View>
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle}>High Demand Right Now!</Text>
                <Text style={styles.bannerBody}>
                  Delivery times are longer than usual. Schedule ahead to lock in a priority slot.
                </Text>
                <TouchableOpacity
                  style={styles.bannerCta}
                  onPress={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    router.push('/(app)/(tabs)/schedule' as any);
                  }}
                >
                  <Text style={styles.bannerCtaText}>Schedule with 111</Text>
                  <Ionicons name="arrow-forward" size={12} color={FudsColors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category grid with decorative images */}
            <Text style={styles.sectionTitle}>What are you looking for?</Text>
            <View style={styles.categoryRow}>
              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  activeFilter === 'restaurant' && styles.categoryCardActive,
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  setActiveFilter((f) => (f === 'restaurant' ? 'all' : 'restaurant'))
                }
              >
                <View style={styles.categoryTextCol}>
                  <Text style={styles.categoryTitle}>Prepared Meals</Text>
                  <Text style={styles.categorySubtitle}>Hot & fresh</Text>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>Order Food</Text>
                  </View>
                </View>
                <Image source={{ uri: FudsImages.jollof }} style={styles.categoryImage} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  activeFilter === 'grocery_store' && styles.categoryCardActive,
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  setActiveFilter((f) => (f === 'grocery_store' ? 'all' : 'grocery_store'))
                }
              >
                <View style={styles.categoryTextCol}>
                  <Text style={styles.categoryTitle}>Groceries</Text>
                  <Text style={styles.categorySubtitle}>Fresh & pantry</Text>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>Shop Fresh</Text>
                  </View>
                </View>
                <Image source={{ uri: FudsImages.groceries }} style={styles.categoryImage} />
              </TouchableOpacity>
            </View>

            {/* Diet strip when user has a goal */}
            {dietLabel ? (
              <View style={styles.dietStrip}>
                <View style={styles.dietHeader}>
                  <View style={styles.dietTitleRow}>
                    <Ionicons name="sparkles" size={16} color={FudsColors.primary} />
                    <Text style={styles.dietTitle}>Tailored for {dietLabel}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      router.push('/(app)/(tabs)/profile' as any);
                    }}
                  >
                    <Text style={styles.dietLink}>Change goal</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.dietHint}>
                  We&apos;ll highlight meals that fit your goals as you browse vendors below.
                </Text>
              </View>
            ) : null}

            {/* Deals of the week — horizontal promos */}
            <View style={styles.promoHeader}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Deals of the Week</Text>
              <Text style={styles.seeAll}>See all</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promoScroll}
            >
              <View style={[styles.promoCard, styles.promoCardPrimary]}>
                <View style={styles.promoCopy}>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>PROMO: JOLLOF50</Text>
                  </View>
                  <Text style={styles.promoTitle}>50% Off Jollof Rice</Text>
                  <Text style={styles.promoSub}>Valid at select Lagos outlets</Text>
                </View>
                <Image source={{ uri: FudsImages.jollof }} style={styles.promoImage} />
              </View>
              <View style={[styles.promoCard, styles.promoCardDark]}>
                <View style={styles.promoCopy}>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>WEEKLY RESTOCK</Text>
                  </View>
                  <Text style={styles.promoTitle}>Free Delivery on Groceries</Text>
                  <Text style={styles.promoSub}>Orders above ₦15,000</Text>
                </View>
                <Image source={{ uri: FudsImages.groceries }} style={styles.promoImage} />
              </View>
            </ScrollView>

            <View style={styles.popularHeader}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Popular Near You</Text>
              {activeFilter !== 'all' && (
                <TouchableOpacity onPress={() => setActiveFilter('all')}>
                  <Text style={styles.seeAll}>Show all</Text>
                </TouchableOpacity>
              )}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        }
        renderItem={({ item }) => {
          const open = isVendorOpen(item);
          return (
            <TouchableOpacity
              style={[styles.vendorCard, !open && styles.vendorCardClosed]}
              activeOpacity={0.92}
              onPress={() => goToVendor(item.id)}
            >
              <View style={styles.vendorImageWrap}>
                {item.business_logo ? (
                  <Image
                    source={{ uri: item.business_logo }}
                    style={[styles.vendorImage, !open && styles.vendorImageGrey]}
                  />
                ) : (
                  <Image
                    source={{
                      uri:
                        item.category === 'grocery_store' || item.category === 'supermarket'
                          ? FudsImages.groceries
                          : FudsImages.jollof,
                    }}
                    style={[styles.vendorImage, !open && styles.vendorImageGrey]}
                  />
                )}
                {!open && (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>Closed</Text>
                  </View>
                )}
                {open && item.opening_time && item.closing_time ? (
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaBadgeText}>
                      {formatHours(item.opening_time)}–{formatHours(item.closing_time)}
                    </Text>
                  </View>
                ) : null}
                {!open && item.opening_time ? (
                  <View style={styles.reopenBadge}>
                    <Text style={styles.reopenBadgeText}>
                      Reopens {formatHours(item.opening_time)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.vendorInfoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vendorName}>{item.business_name}</Text>
                  <Text style={styles.vendorMeta} numberOfLines={1}>
                    {formatCategory(item.category)}
                    {item.address ? ` · ${item.address.split(',')[0]}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: open ? FudsColors.openBg : FudsColors.muted },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: open ? FudsColors.openText : FudsColors.mutedForeground },
                    ]}
                  >
                    {open ? 'OPEN NOW' : 'CLOSED'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={FudsColors.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>No vendors nearby yet.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: FudsColors.border,
    backgroundColor: FudsColors.background,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveringLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: FudsColors.mutedForeground,
    letterSpacing: 0.8,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: {
    fontSize: 13,
    fontWeight: '800',
    color: FudsColors.foreground,
    maxWidth: 220,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FudsColors.background,
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: FudsColors.destructive,
  },
  banner: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
    backgroundColor: FudsColors.tertiary,
    borderRadius: FudsRadius.xl,
    flexDirection: 'row',
    gap: 12,
    ...FudsShadow.md,
  },
  bannerIconBox: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
  },
  bannerTextCol: { flex: 1, gap: 4 },
  bannerTitle: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.2 },
  bannerBody: { color: 'rgba(255,255,255,0.92)', fontSize: 11, lineHeight: 16 },
  bannerCta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FudsColors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  bannerCtaText: { color: FudsColors.primary, fontWeight: '800', fontSize: 11 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: FudsColors.foreground,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.three,
  },
  categoryCard: {
    flex: 1,
    height: 140,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  categoryCardActive: {
    borderColor: FudsColors.primary,
    borderWidth: 2,
  },
  categoryTextCol: { zIndex: 2, flex: 1, justifyContent: 'space-between', maxWidth: '75%' },
  categoryTitle: { fontWeight: '800', fontSize: 15, color: FudsColors.foreground },
  categorySubtitle: { fontSize: 11, color: FudsColors.mutedForeground, marginTop: 2 },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryPillText: { fontSize: 10, fontWeight: '800', color: FudsColors.primary },
  categoryImage: {
    position: 'absolute',
    right: -16,
    bottom: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.85,
  },
  dietStrip: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(159,225,203,0.25)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(159,225,203,0.45)',
  },
  dietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dietTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dietTitle: { fontSize: 13, fontWeight: '800', color: FudsColors.foreground },
  dietLink: { fontSize: 12, fontWeight: '800', color: FudsColors.primary },
  dietHint: { fontSize: 12, color: FudsColors.mutedForeground, lineHeight: 17 },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  popularHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  seeAll: { fontSize: 12, fontWeight: '800', color: FudsColors.primary },
  promoScroll: { paddingHorizontal: Spacing.three, gap: 12 },
  promoCard: {
    width: 280,
    height: 140,
    borderRadius: FudsRadius.xl,
    padding: Spacing.three,
    overflow: 'hidden',
    justifyContent: 'space-between',
    ...FudsShadow.md,
  },
  promoCardPrimary: {
    backgroundColor: FudsColors.primary,
  },
  promoCardDark: {
    backgroundColor: FudsColors.tertiary,
  },
  promoCopy: { zIndex: 2, gap: 4, maxWidth: '72%' },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  promoBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  promoTitle: { color: '#fff', fontSize: 17, fontWeight: '900', lineHeight: 22 },
  promoSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  promoImage: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.4,
  },
  errorText: {
    color: FudsColors.destructive,
    fontSize: 12,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    fontWeight: '600',
  },
  vendorCard: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  vendorCardClosed: { opacity: 0.72 },
  vendorImageWrap: { height: 160, backgroundColor: FudsColors.muted },
  vendorImage: { width: '100%', height: '100%' },
  vendorImageGrey: { opacity: 0.75 },
  closedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: FudsColors.destructive,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  closedBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  etaBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: FudsColors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  etaBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  reopenBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: FudsColors.muted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reopenBadgeText: { color: FudsColors.foreground, fontSize: 11, fontWeight: '800' },
  vendorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: 8,
  },
  vendorName: { fontWeight: '800', fontSize: 14, color: FudsColors.foreground },
  vendorMeta: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 3 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  emptyText: {
    textAlign: 'center',
    color: FudsColors.mutedForeground,
    marginTop: 60,
    fontSize: 13,
  },
});
