/**
 * Home — Glovo/Chowdeck-inspired layout for FUDS Lagos.
 * Animations are limited to the category section only.
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AddressEditModal } from '@/components/ui/address-edit-modal';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { FadeIn as FadeInView } from '@/components/ui/fade-in';
import { FALLBACK_CATEGORIES, getCategoryVisual } from '@/constants/browse';
import {
  FudsColors,
  FudsImages,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/context/auth';
import {
  browseApi,
  isVendorOpen,
  type BrowseCategory,
  type Product,
  type Vendor,
} from '@/lib/api';

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

export default function HomeScreen() {
  const { user, updateProfile } = useAuth();
  // Standard Tabs already reserve space; only a small buffer is needed
  const listBottomPad = Spacing.four;

  const [categories, setCategories] = useState<BrowseCategory[]>(FALLBACK_CATEGORIES);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const loadData = useCallback(async (group: string | null) => {
    try {
      setError(null);
      const [cats, vendorList, products] = await Promise.all([
        browseApi.listCategories().catch(() => FALLBACK_CATEGORIES),
        browseApi.listVendors(group ? { group, limit: 40 } : { limit: 40 }),
        browseApi.listProducts(group ? { group, limit: 12 } : { limit: 12 }),
      ]);
      setCategories(cats.length ? cats : FALLBACK_CATEGORIES);
      setVendors(vendorList);
      setFeatured(products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load home feed');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData(activeGroup);
      setLoading(false);
    })();
  }, [loadData, activeGroup]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(activeGroup);
    setRefreshing(false);
  }, [loadData, activeGroup]);

  const goToVendor = (vendorId: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/(app)/vendor/${vendorId}` as any);
  };

  const handleSaveAddress = async (address: string) => {
    setSavingAddress(true);
    setAddressError(null);
    try {
      await updateProfile({ address }, { navigate: false });
      setAddressModalOpen(false);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Could not save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const selectGroup = (key: string) => {
    setActiveGroup((prev) => (prev === key ? null : key));
  };

  const activeLabel =
    categories.find((c) => c.key === activeGroup)?.label ?? 'All stores';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AddressEditModal
        visible={addressModalOpen}
        initialAddress={user?.address}
        saving={savingAddress}
        error={addressError}
        onClose={() => {
          if (!savingAddress) {
            setAddressModalOpen(false);
            setAddressError(null);
          }
        }}
        onSave={handleSaveAddress}
      />

      <FlatList
        data={vendors}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FudsColors.primary} />
        }
        contentContainerStyle={{ paddingBottom: listBottomPad }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Location + filter — static, no animation */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.locationPill}
                onPress={() => setAddressModalOpen(true)}
                activeOpacity={0.85}
              >
                <View style={styles.locationIconShell}>
                  <Ionicons name="location" size={14} color={FudsColors.primary} />
                </View>
                <Text style={styles.locationText} numberOfLines={1}>
                  {user?.address?.trim() || 'Set delivery address'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={FudsColors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85}>
                <Ionicons name="options-outline" size={18} color={FudsColors.primaryForeground} />
                <Text style={styles.filterLabel}>Filter</Text>
              </TouchableOpacity>
            </View>

            {/* Category hub — animations ONLY here */}
            <View style={styles.categoryHub}>
              <View style={styles.hubBlobA} />
              <View style={styles.hubBlobB} />
              <View style={styles.hubBlobC} />

              <View style={styles.categoryGrid}>
                {categories.map((cat, idx) => {
                  const visual = getCategoryVisual(cat.icon || cat.key);
                  const selected = activeGroup === cat.key;
                  const radius = idx % 2 === 0 ? 28 : 36;
                  return (
                    <FadeInView key={cat.key} delay={80 + idx * 60} style={styles.categoryItem}>
                      <AnimatedPressable
                        scaleTo={0.9}
                        onPress={() => selectGroup(cat.key)}
                        style={styles.categoryPress}
                      >
                        <View
                          style={[
                            styles.categoryShape,
                            {
                              backgroundColor: visual.bg,
                              borderRadius: radius,
                            },
                            selected && {
                              borderColor: visual.tint,
                              borderWidth: 2.5,
                              transform: [{ rotate: '-3deg' }, { scale: 1.05 }],
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.categoryShine,
                              { borderTopLeftRadius: radius, borderTopRightRadius: radius },
                            ]}
                          />
                          <Ionicons name={visual.icon} size={28} color={visual.tint} />
                        </View>
                        <Text style={[styles.categoryLabel, selected && { color: visual.tint }]}>
                          {cat.label}
                        </Text>
                        {cat.vendor_count > 0 ? (
                          <View
                            style={[
                              styles.countPill,
                              selected && { backgroundColor: visual.tint },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryCount,
                                selected && { color: '#fff' },
                              ]}
                            >
                              {cat.vendor_count}
                            </Text>
                          </View>
                        ) : null}
                      </AnimatedPressable>
                    </FadeInView>
                  );
                })}
              </View>
            </View>

            {/* Promo */}
            <View style={styles.promoBanner}>
              <View style={styles.promoWave} />
              <View style={styles.promoCopy}>
                <Text style={styles.promoEyebrow}>FUDS DEALS</Text>
                <Text style={styles.promoTitle}>Pay less, eat better</Text>
                <Text style={styles.promoSub}>Free delivery on first order this week</Text>
                <View style={styles.promoCta}>
                  <Text style={styles.promoCtaText}>Order now</Text>
                </View>
              </View>
              <Image source={{ uri: FudsImages.jollof }} style={styles.promoImage} />
            </View>

            {/* High demand */}
            <TouchableOpacity
              style={styles.demandCard}
              activeOpacity={0.9}
              onPress={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                router.push('/(app)/(tabs)/schedule' as any);
              }}
            >
              <View style={styles.demandIcon}>
                <Ionicons name="flash" size={20} color={FudsColors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.demandTitle}>High demand right now</Text>
                <Text style={styles.demandBody}>
                  Schedule with 111 for priority slots from 08:00 onwards.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* Featured */}
            {featured.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {activeGroup ? `${activeLabel} picks` : 'Featured'} ✨
                  </Text>
                  <Text style={styles.seeAll}>See all</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredScroll}
                >
                  {featured.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.featuredCard}
                      activeOpacity={0.9}
                      onPress={() => goToVendor(p.vendor_id)}
                    >
                      <View style={styles.featuredImageShell}>
                        <Image
                          source={{
                            uri:
                              p.image_url ||
                              (p.category === 'grocery_store' ||
                              p.category === 'supermarket' ||
                              p.category === 'local_market'
                                ? FudsImages.groceries
                                : FudsImages.jollof),
                          }}
                          style={styles.featuredImage}
                        />
                        <View style={styles.addFab}>
                          <Ionicons name="add" size={16} color="#fff" />
                        </View>
                      </View>
                      <Text style={styles.featuredName} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={styles.featuredPrice}>
                        ₦{Number(p.price).toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeGroup ? activeLabel : 'All stores'}
              </Text>
              {activeGroup ? (
                <TouchableOpacity onPress={() => setActiveGroup(null)}>
                  <Text style={styles.seeAll}>Clear filter</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.seeAll}>{vendors.length} nearby</Text>
              )}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        }
        renderItem={({ item }) => {
          const open = isVendorOpen(item);
          const cover =
            item.business_logo ||
            (item.category === 'grocery_store' ||
            item.category === 'supermarket' ||
            item.category === 'local_market' ||
            item.browse_group === 'grocery'
              ? FudsImages.groceries
              : FudsImages.jollof);

          return (
            <TouchableOpacity
              style={[styles.vendorCard, !open && styles.vendorCardClosed]}
              activeOpacity={0.92}
              onPress={() => goToVendor(item.id)}
            >
              <View style={styles.vendorImageWrap}>
                <Image
                  source={{ uri: cover }}
                  style={[styles.vendorImage, !open && styles.vendorImageDim]}
                />
                {!open && (
                  <View style={styles.closedOverlay}>
                    <View style={styles.closedPill}>
                      <Text style={styles.closedTitle}>Store is closed</Text>
                      <Text style={styles.closedSub}>{reopenLabel(item)}</Text>
                    </View>
                  </View>
                )}
                {open && (
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaText}>
                      {formatHours(item.opening_time)}–{formatHours(item.closing_time) || 'late'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.vendorMeta}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vendorName}>{item.business_name}</Text>
                  <Text style={styles.vendorSub} numberOfLines={1}>
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
                    {open ? 'OPEN' : 'CLOSED'}
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
            <View style={styles.emptyBox}>
              <View style={styles.emptyShape}>
                <Ionicons name="storefront-outline" size={36} color={FudsColors.mutedForeground} />
              </View>
              <Text style={styles.emptyText}>
                {activeGroup
                  ? `No ${activeLabel.toLowerCase()} stores nearby yet.`
                  : 'No vendors nearby yet.'}
              </Text>
            </View>
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
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  locationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.full,
    borderWidth: 1,
    borderColor: FudsColors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...FudsShadow.sm,
  },
  locationIconShell: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: FudsColors.foreground,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: FudsColors.primary,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...FudsShadow.sm,
  },
  filterLabel: {
    color: FudsColors.primaryForeground,
    fontWeight: '800',
    fontSize: 13,
  },

  categoryHub: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    backgroundColor: '#F5C518',
    borderRadius: 28,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
    overflow: 'hidden',
    ...FudsShadow.md,
  },
  hubBlobA: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  hubBlobB: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 90,
    borderRadius: 40,
    backgroundColor: 'rgba(255,180,0,0.45)',
    transform: [{ rotate: '-15deg' }],
  },
  hubBlobC: {
    position: 'absolute',
    top: 40,
    left: '40%',
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '20deg' }],
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 16,
    zIndex: 2,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
  },
  categoryPress: { alignItems: 'center', gap: 6 },
  categoryShape: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  categoryShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: FudsColors.foreground,
    textAlign: 'center',
  },
  countPill: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(8,80,65,0.12)',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(8,80,65,0.7)',
  },

  promoBanner: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    backgroundColor: FudsColors.primary,
    borderRadius: 26,
    padding: Spacing.three,
    minHeight: 128,
    overflow: 'hidden',
    flexDirection: 'row',
    ...FudsShadow.sm,
  },
  promoWave: {
    position: 'absolute',
    right: 40,
    bottom: -30,
    width: 160,
    height: 100,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  promoCopy: { flex: 1, zIndex: 2, gap: 4, maxWidth: '70%' },
  promoEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  promoTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  promoSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  promoCta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: FudsRadius.full,
  },
  promoCtaText: { color: FudsColors.primary, fontWeight: '800', fontSize: 12 },
  promoImage: {
    position: 'absolute',
    right: -12,
    bottom: -16,
    width: 110,
    height: 110,
    borderRadius: 40,
    opacity: 0.5,
    transform: [{ rotate: '8deg' }],
  },

  demandCard: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    backgroundColor: FudsColors.tertiary,
    borderRadius: 22,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...FudsShadow.sm,
  },
  demandIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  demandTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  demandBody: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: FudsColors.foreground,
  },
  seeAll: { fontSize: 12, fontWeight: '800', color: FudsColors.primary },

  featuredScroll: { paddingHorizontal: Spacing.three, gap: 12 },
  featuredCard: {
    width: 148,
    backgroundColor: FudsColors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: 10,
    ...FudsShadow.sm,
  },
  featuredImageShell: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 104,
    backgroundColor: FudsColors.muted,
  },
  addFab: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...FudsShadow.sm,
  },
  featuredName: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    color: FudsColors.foreground,
    minHeight: 32,
  },
  featuredPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: FudsColors.primary,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  vendorCardClosed: { opacity: 0.97 },
  vendorImageWrap: { height: 154, backgroundColor: FudsColors.muted },
  vendorImage: { width: '100%', height: '100%' },
  vendorImageDim: { opacity: 0.55 },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  closedTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  closedSub: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 12, marginTop: 2 },
  etaBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: FudsColors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  etaText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: 8,
  },
  vendorName: { fontWeight: '800', fontSize: 14, color: FudsColors.foreground },
  vendorSub: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 2 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  emptyBox: { alignItems: 'center', gap: 10, marginTop: 48, paddingHorizontal: 32 },
  emptyShape: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: FudsColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  emptyText: {
    textAlign: 'center',
    color: FudsColors.mutedForeground,
    fontSize: 13,
    fontWeight: '600',
  },
});
