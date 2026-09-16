/**
 * FUDS Marketplace — compact grocery aisles, quantity picker, animated hero.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FudsButton } from '@/components/ui/fuds-button';
import { FudsColors, FudsImages, FudsShadow, Spacing } from '@/constants/theme';
import {
    cartApi,
    marketplaceApi,
    type GroceryAisleRead,
    type ProductWithVendor,
} from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';

type IonName = ComponentProps<typeof Ionicons>['name'];

const ALL_AISLE = 'all';
const TYPICAL_WEEKLY_ITEMS = 8;

const HERO_IMAGES = [
  FudsImages.groceries,
  FudsImages.jollof,
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=70',
  'https://images.unsplash.com/photo-1583258292688-d29677845604?auto=format&fit=crop&w=1200&q=70',
];

const HERO_LINES = ['Pay less, shop smarter', 'Stock the house for less', 'Fresh market, fair prices'];

const AISLE_ICONS: Record<string, IonName> = {
  cafe: 'cafe',
  water: 'water',
  nutrition: 'nutrition',
  basket: 'basket',
  leaf: 'leaf',
  'file-tray': 'file-tray',
  sparkles: 'sparkles',
};

function naira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const [aisles, setAisles] = useState<GroceryAisleRead[]>([]);
  const [selectedAisle, setSelectedAisle] = useState<string>(ALL_AISLE);
  const [allProducts, setAllProducts] = useState<ProductWithVendor[]>([]);
  const [products, setProducts] = useState<ProductWithVendor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [picked, setPicked] = useState<ProductWithVendor | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [basketCount, setBasketCount] = useState(0);
  const [basketTotal, setBasketTotal] = useState(0);

  const heroIndex = useRef(0);
  const lineIndex = useRef(0);
  const imageOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const titleY = useRef(new Animated.Value(0)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const modalSheetY = useRef(new Animated.Value(80)).current;
  const [heroImage, setHeroImage] = useState(HERO_IMAGES[0]);
  const [heroLine, setHeroLine] = useState(HERO_LINES[0]);

  useEffect(() => {
    if (!picked) return;

    modalBackdropOpacity.setValue(0);
    modalSheetY.setValue(80);
    Animated.parallel([
      Animated.timing(modalBackdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(modalSheetY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [modalBackdropOpacity, modalSheetY, picked]);

  const loadCatalog = useCallback(async () => {
    try {
      setError(null);
      const [aisleRows, catalog, full] = await Promise.all([
        marketplaceApi.listAisles().catch(() => []),
        marketplaceApi.getCatalog({
          aisle: selectedAisle === ALL_AISLE ? undefined : selectedAisle,
          search: search.trim() || undefined,
        }),
        marketplaceApi.getCatalog().catch(() => ({ aisles: [], products: [] })),
      ]);
      setAisles(aisleRows.length ? aisleRows : catalog.aisles);
      setProducts(catalog.products);
      if (full.products.length) setAllProducts(full.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load marketplace');
    } finally {
      setLoading(false);
    }
  }, [search, selectedAisle]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;
      setLoading(true);
      await loadCatalog();
    }, 160);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadCatalog]);

  useEffect(() => {
    const tick = setInterval(() => {
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        heroIndex.current = (heroIndex.current + 1) % HERO_IMAGES.length;
        setHeroImage(HERO_IMAGES[heroIndex.current]);
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }, 4200);
    return () => clearInterval(tick);
  }, [imageOpacity]);

  useEffect(() => {
    const tick = setInterval(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: -8, duration: 280, useNativeDriver: true }),
      ]).start(() => {
        lineIndex.current = (lineIndex.current + 1) % HERO_LINES.length;
        setHeroLine(HERO_LINES[lineIndex.current]);
        titleY.setValue(8);
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(titleY, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]).start();
      });
    }, 3200);
    return () => clearInterval(tick);
  }, [titleOpacity, titleY]);

  const avgBasket = useMemo(() => {
    const source = allProducts.length ? allProducts : products;
    if (!source.length) return 0;
    const avgItem = source.reduce((sum, p) => sum + Number(p.price || 0), 0) / source.length;
    return avgItem * TYPICAL_WEEKLY_ITEMS;
  }, [allProducts, products]);

  const openQty = (product: ProductWithVendor) => {
    setPicked(product);
    setQty(1);
  };

  const addToBasket = async () => {
    if (!picked) return;
    setAdding(true);
    try {
      const cart = await cartApi.addItem({
        product_id: picked.id,
        vendor_id: picked.vendor_id,
        quantity: qty,
      });
      setBasketCount(cart.item_count);
      setBasketTotal(cart.total);
      setPicked(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to basket');
    } finally {
      setAdding(false);
    }
  };

  const selectedLabel =
    selectedAisle === ALL_AISLE
      ? 'All aisles'
      : aisles.find((a) => a.key === selectedAisle)?.label ?? 'Aisle';
  const basketBottomInset = Math.max(insets.bottom + 12, 28);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeGoBack('/(app)/(tabs)/')}>
          <Ionicons name="arrow-back" size={18} color={FudsColors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Groceries & essentials</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <Animated.Image source={{ uri: heroImage }} style={[styles.heroBg, { opacity: imageOpacity }]} />
        <View style={styles.heroScrim} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroBadge}>FUDS MARKETPLACE</Text>
          <Animated.Text style={[styles.heroTitle, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
            {heroLine}
          </Animated.Text>
        </View>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatLabel}>Avg basket</Text>
          <Text style={styles.heroStatValue}>{naira(avgBasket)}</Text>
          <Text style={styles.heroStatHint}>{TYPICAL_WEEKLY_ITEMS} weekly items</Text>
        </View>
      </View>

      <View style={styles.searchRow} pointerEvents="box-none">
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={FudsColors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search milo, milk, cereal…"
            placeholderTextColor={FudsColors.mutedForeground}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setCatOpen(false)}
          />
        </View>
        <TouchableOpacity
          style={[styles.catBtn, catOpen && styles.catBtnOn]}
          onPress={() => setCatOpen((open) => !open)}
        >
          <Text style={[styles.catBtnText, catOpen && styles.catBtnTextOn]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Ionicons
            name={catOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={catOpen ? '#fff' : FudsColors.foreground}
          />
        </TouchableOpacity>
      </View>

      {catOpen ? (
        <Pressable style={styles.catDismiss} onPress={() => setCatOpen(false)}>
          <Pressable style={styles.catDropdown} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={[styles.catRow, selectedAisle === ALL_AISLE && styles.catRowOn]}
              onPress={() => {
                setSelectedAisle(ALL_AISLE);
                setCatOpen(false);
              }}
            >
              <Ionicons name="grid" size={14} color={FudsColors.primary} />
              <Text style={styles.catRowText}>All aisles</Text>
            </TouchableOpacity>
            {aisles.map((aisle) => (
              <TouchableOpacity
                key={aisle.key}
                style={[styles.catRow, selectedAisle === aisle.key && styles.catRowOn]}
                onPress={() => {
                  setSelectedAisle(aisle.key);
                  setCatOpen(false);
                }}
              >
                <Ionicons name={AISLE_ICONS[aisle.icon] ?? 'basket'} size={14} color={FudsColors.primary} />
                <Text style={styles.catRowText}>{aisle.label}</Text>
                <Text style={styles.catRowCount}>{aisle.product_count}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={FudsColors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.grid,
            basketCount > 0 && { paddingBottom: 92 + basketBottomInset },
          ]}
          columnWrapperStyle={styles.columnWrap}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="basket-outline" size={28} color={FudsColors.mutedForeground} />
              <Text style={styles.emptyTitle}>No items</Text>
              <Text style={styles.emptyText}>Try another aisle.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.productCard} activeOpacity={0.88} onPress={() => openQty(item)}>
              <Image
                source={{ uri: item.image_url || FudsImages.groceries }}
                style={styles.productImage}
              />
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.productPrice}>{naira(Number(item.price))}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {basketCount > 0 ? (
        <View style={[styles.basketBar, { bottom: basketBottomInset }]}>
          <View>
            <Text style={styles.basketCount}>
              {basketCount} item{basketCount === 1 ? '' : 's'}
            </Text>
            <Text style={styles.basketTotal}>{naira(basketTotal)}</Text>
          </View>
          <TouchableOpacity
            style={styles.basketCta}
            onPress={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              router.push('/(app)/(tabs)/orders' as any);
            }}
          >
            <Text style={styles.basketCtaText}>View cart</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={!!picked} transparent animationType="none" onRequestClose={() => setPicked(null)}>
        <View style={styles.modalScrim}>
          <Animated.View style={[styles.modalBackdrop, { opacity: modalBackdropOpacity }]} />
          <Animated.View
            style={[
              styles.qtySheet,
              {
                paddingBottom: Math.max(insets.bottom + 12, 28),
                transform: [{ translateY: modalSheetY }],
              },
            ]}
          >
            <Text style={styles.sheetTitle}>How many?</Text>
            <Text style={styles.qtyName}>{picked?.name}</Text>
            <Text style={styles.qtyPrice}>{picked ? naira(Number(picked.price) * qty) : ''}</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty((n) => Math.max(1, n - 1))}
              >
                <Ionicons name="remove" size={18} color={FudsColors.foreground} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((n) => Math.min(50, n + 1))}>
                <Ionicons name="add" size={18} color={FudsColors.foreground} />
              </TouchableOpacity>
            </View>
            <FudsButton label={adding ? 'Adding…' : 'Add to basket'} loading={adding} onPress={addToBasket} />
            <TouchableOpacity onPress={() => setPicked(null)} style={styles.qtyCancel}>
              <Text style={styles.qtyCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingTop: 4,
    paddingBottom: 6,
    position: 'relative',
    zIndex: 20,
    elevation: 4,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '900', color: FudsColors.foreground },
  subtitle: { color: FudsColors.mutedForeground, fontSize: 11, fontWeight: '600' },
  heroCard: {
    marginHorizontal: Spacing.three,
    marginBottom: 10,
    height: 108,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...FudsShadow.sm,
  },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 80, 65, 0.48)',
  },
  heroCopy: { paddingHorizontal: 12, paddingBottom: 10, paddingRight: 108 },
  heroBadge: { color: FudsColors.secondary, fontWeight: '800', fontSize: 9, letterSpacing: 0.8 },
  heroTitle: { marginTop: 4, fontSize: 18, fontWeight: '900', color: '#fff' },
  heroStat: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 86,
    alignItems: 'center',
  },
  heroStatLabel: { color: '#DFF8EE', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  heroStatValue: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 2 },
  heroStatHint: { color: 'rgba(255,255,255,0.75)', fontSize: 8, fontWeight: '600', marginTop: 2 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.three,
    marginBottom: 8,
    zIndex: 30,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: FudsColors.foreground, marginLeft: 6, paddingVertical: 0 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    maxWidth: 118,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
  },
  catBtnOn: { backgroundColor: FudsColors.primary, borderColor: FudsColors.primary },
  catBtnText: { flexShrink: 1, fontSize: 11, fontWeight: '800', color: FudsColors.foreground },
  catBtnTextOn: { color: '#fff' },
  catDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    paddingHorizontal: Spacing.three,
    paddingTop: 168,
  },
  catDropdown: {
    marginLeft: 'auto',
    width: 220,
    maxHeight: 320,
    backgroundColor: FudsColors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    ...FudsShadow.md,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FudsColors.border,
  },
  catRowOn: { backgroundColor: 'rgba(29,158,117,0.1)' },
  catRowText: { flex: 1, fontSize: 13, fontWeight: '700', color: FudsColors.foreground },
  catRowCount: { fontSize: 11, fontWeight: '800', color: FudsColors.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: {
    marginHorizontal: Spacing.three,
    marginBottom: 6,
    color: FudsColors.destructive,
    fontSize: 11,
    fontWeight: '700',
  },
  grid: { paddingHorizontal: Spacing.three, paddingBottom: 28 },
  columnWrap: { gap: 8, marginBottom: 8 },
  productCard: {
    flex: 1,
    maxWidth: '32%',
    backgroundColor: FudsColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  productImage: { width: '100%', height: 72, backgroundColor: FudsColors.muted },
  productName: {
    marginTop: 6,
    marginHorizontal: 6,
    fontSize: 11,
    fontWeight: '800',
    color: FudsColors.foreground,
    minHeight: 28,
  },
  productPrice: { marginHorizontal: 6, marginTop: 2, fontSize: 12, fontWeight: '900', color: FudsColors.primary },
  emptyBox: { alignItems: 'center', paddingVertical: 36 },
  emptyTitle: { marginTop: 8, fontSize: 14, fontWeight: '900', color: FudsColors.foreground },
  emptyText: { marginTop: 2, fontSize: 11, color: FudsColors.mutedForeground, fontWeight: '600' },
  basketBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: FudsColors.foreground,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  basketCount: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
  basketTotal: { color: '#fff', fontSize: 16, fontWeight: '900' },
  basketCta: { backgroundColor: FudsColors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  basketCtaText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  filterSheet: {
    backgroundColor: FudsColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
  },
  qtySheet: {
    backgroundColor: FudsColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
  },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: FudsColors.foreground },
  sheetSub: { marginTop: 4, marginBottom: 10, fontSize: 12, color: FudsColors.mutedForeground, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FudsColors.border,
  },
  filterRowOn: { backgroundColor: 'rgba(29,158,117,0.08)', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  filterRowText: { fontSize: 14, fontWeight: '700', color: FudsColors.foreground },
  filterCount: { fontSize: 12, fontWeight: '800', color: FudsColors.primary },
  qtyName: { marginTop: 6, fontSize: 14, fontWeight: '800', color: FudsColors.foreground },
  qtyPrice: { marginTop: 4, fontSize: 18, fontWeight: '900', color: FudsColors.primary, marginBottom: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FudsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FudsColors.background,
  },
  qtyValue: { fontSize: 22, fontWeight: '900', color: FudsColors.foreground, minWidth: 28, textAlign: 'center' },
  qtyCancel: { alignItems: 'center', marginTop: 10 },
  qtyCancelText: { fontSize: 13, fontWeight: '800', color: FudsColors.mutedForeground },
});
