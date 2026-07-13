/**
 * Vendor detail — hero + floating info card + menu list (mockup style).
 * Products from GET /browse/vendors/{id}.
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  browseApi,
  cartApi,
  isVendorOpen,
  type CartRead,
  type Product,
  type VendorWithProducts,
} from '@/lib/api';
import {
  FudsColors,
  FudsImages,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';

function formatCategory(category: string | null): string {
  if (!category) return 'Vendor';
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function VendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendorId = Number(id);
  const insets = useSafeAreaInsets();

  const [vendor, setVendor] = useState<VendorWithProducts | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartRead | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    (async () => {
      setLoading(true);
      try {
        const [vendorData, cartData] = await Promise.all([
          browseApi.getVendor(vendorId),
          cartApi.getCart().catch(() => null),
        ]);
        setVendor(vendorData);
        setProducts(vendorData.products ?? []);
        setCart(cartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load vendor');
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  const handleAddToCart = async (productId: number) => {
    if (!vendor) return;
    setAddingId(productId);
    setError(null);
    try {
      const updated = await cartApi.addItem({
        product_id: productId,
        vendor_id: vendor.id,
        quantity: 1,
      });
      setCart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add item');
    } finally {
      setAddingId(null);
    }
  };

  const heroUri = useMemo(() => {
    if (vendor?.business_logo) return vendor.business_logo;
    if (vendor?.category === 'grocery_store' || vendor?.category === 'supermarket') {
      return FudsImages.groceries;
    }
    return FudsImages.jollof;
  }, [vendor]);

  const cartItemCount = cart?.item_count ?? 0;
  const cartVendorCount = useMemo(() => {
    if (!cart?.items?.length) return 0;
    return new Set(cart.items.map((i) => i.vendor_id)).size;
  }, [cart]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={FudsColors.primary} size="large" />
      </View>
    );
  }

  const open = vendor ? isVendorOpen(vendor) : false;
  const cartBarVisible = cartItemCount > 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: cartBarVisible ? 120 + insets.bottom : 40 + insets.bottom,
        }}
        ListHeaderComponent={
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <Image source={{ uri: heroUri }} style={styles.heroImage} />
              <View style={styles.heroOverlay} />
              <SafeAreaView edges={['top']} style={styles.heroNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={20} color={FudsColors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn}>
                  <Ionicons name="heart-outline" size={20} color={FudsColors.foreground} />
                </TouchableOpacity>
              </SafeAreaView>

              {/* Floating info card */}
              <View style={styles.infoCard}>
                <View style={styles.infoTop}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.vendorName}>{vendor?.business_name ?? 'Vendor'}</Text>
                    <Text style={styles.vendorMeta}>
                      {formatCategory(vendor?.category ?? null)}
                      {vendor?.address ? ` · ${vendor.address.split(',')[0]}` : ''}
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
                <View style={styles.infoFooter}>
                  {vendor?.opening_time && vendor?.closing_time ? (
                    <View style={styles.infoStat}>
                      <Ionicons name="time-outline" size={14} color={FudsColors.primary} />
                      <Text style={styles.infoStatText}>
                        {vendor.opening_time.slice(0, 5)}–{vendor.closing_time.slice(0, 5)}
                      </Text>
                    </View>
                  ) : null}
                  {vendor?.business_description ? (
                    <Text style={styles.infoDesc} numberOfLines={2}>
                      {vendor.business_description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <Text style={styles.menuCount}>{products.length} items</Text>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={14} color={FudsColors.destructive} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.productCard}>
            <View style={styles.productCopy}>
              <View style={styles.productTitleRow}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                {index < 2 ? (
                  <View style={styles.bestSeller}>
                    <Text style={styles.bestSellerText}>Popular</Text>
                  </View>
                ) : null}
              </View>
              {item.category ? (
                <Text style={styles.productCategory} numberOfLines={1}>
                  {formatCategory(item.category)}
                </Text>
              ) : null}
              <Text style={styles.productPrice}>₦{Number(item.price).toLocaleString()}</Text>
            </View>
            <View style={styles.productImageWrap}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.productImage} />
              ) : (
                <Image source={{ uri: heroUri }} style={styles.productImage} />
              )}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAddToCart(item.id)}
                disabled={addingId === item.id}
                activeOpacity={0.85}
              >
                {addingId === item.id ? (
                  <ActivityIndicator size="small" color={FudsColors.primaryForeground} />
                ) : (
                  <Ionicons name="add" size={18} color={FudsColors.primaryForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No products listed yet.</Text>
        }
      />

      {/* Multi-vendor cart nudge — mockup style */}
      {cartBarVisible && (
        <View style={[styles.cartBarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={styles.cartBar}
            activeOpacity={0.92}
            onPress={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              router.push('/(app)/(tabs)/cart' as any);
            }}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarIcon}>
                <Ionicons name="cart" size={18} color={FudsColors.primaryForeground} />
              </View>
              <View>
                <Text style={styles.cartBarTitle}>
                  {cartItemCount} item{cartItemCount === 1 ? '' : 's'}
                  {cartVendorCount > 1 ? ` across ${cartVendorCount} vendors` : ''}
                </Text>
                <Text style={styles.cartBarSub}>
                  ₦{Number(cart?.total ?? 0).toLocaleString()} total
                </Text>
              </View>
            </View>
            <View style={styles.viewCartBtn}>
              <Text style={styles.viewCartText}>View Cart</Text>
              <Ionicons name="arrow-forward" size={12} color={FudsColors.primaryForeground} />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FudsColors.background,
  },
  hero: {
    height: 260,
    backgroundColor: FudsColors.tertiary,
    marginBottom: 56,
  },
  heroImage: { width: '100%', height: '100%', opacity: 0.85 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,80,65,0.25)',
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...FudsShadow.sm,
  },
  infoCard: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: -48,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    gap: 10,
    ...FudsShadow.md,
  },
  infoTop: { flexDirection: 'row', alignItems: 'flex-start' },
  vendorName: { fontSize: 18, fontWeight: '800', color: FudsColors.foreground },
  vendorMeta: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 3 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  infoFooter: { borderTopWidth: 1, borderTopColor: 'rgba(216,212,200,0.6)', paddingTop: 10, gap: 6 },
  infoStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoStatText: { fontSize: 12, fontWeight: '700', color: FudsColors.foreground },
  infoDesc: { fontSize: 12, color: FudsColors.mutedForeground, lineHeight: 17 },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  menuTitle: { fontSize: 16, fontWeight: '800', color: FudsColors.foreground },
  menuCount: { fontSize: 12, fontWeight: '700', color: FudsColors.mutedForeground },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    backgroundColor: '#FEF2F2',
    borderRadius: FudsRadius.md,
  },
  errorText: { flex: 1, color: FudsColors.destructive, fontSize: 12, fontWeight: '600' },
  productCard: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two + 2,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.lg,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...FudsShadow.sm,
  },
  productCopy: { flex: 1, gap: 4, paddingRight: 4 },
  productTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' },
  productName: { fontWeight: '800', fontSize: 14, color: FudsColors.foreground, flexShrink: 1 },
  bestSeller: {
    backgroundColor: 'rgba(29,158,117,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestSellerText: { fontSize: 9, fontWeight: '800', color: FudsColors.primary },
  productCategory: {
    fontSize: 11,
    color: FudsColors.mutedForeground,
    textTransform: 'capitalize',
  },
  productPrice: { fontSize: 14, fontWeight: '800', color: FudsColors.primary, marginTop: 4 },
  productImageWrap: {
    width: 96,
    height: 96,
    borderRadius: FudsRadius.md,
    overflow: 'hidden',
    backgroundColor: FudsColors.muted,
  },
  productImage: { width: '100%', height: '100%' },
  addBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...FudsShadow.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: FudsColors.mutedForeground,
    marginTop: 40,
    fontSize: 13,
  },
  cartBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
  },
  cartBar: {
    backgroundColor: FudsColors.tertiary,
    borderRadius: FudsRadius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...FudsShadow.md,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cartBarIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBarTitle: { color: '#fff', fontSize: 12, fontWeight: '800' },
  cartBarSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FudsColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewCartText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
