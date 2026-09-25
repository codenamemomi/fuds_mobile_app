/**
 * Create Market List — Dedicated screen for building a grocery subscription list.
 *
 * Uses the existing marketplace API:
 *  - marketplaceApi.listAisles()         → horizontal category chips
 *  - marketplaceApi.getCatalog()         → product grid (filtered by aisle)
 *  - marketplaceApi.listShoppingLists()  → pre-load an existing subscription
 *  - marketplaceApi.createShoppingList() → save new list
 *  - marketplaceApi.updateShoppingList() → update existing
 */

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomTabInset,
  FudsColors,
  FudsImages,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';
import {
  marketplaceApi,
  type GroceryAisleRead,
  type GrocerySubscriptionRead,
  type MarketplaceProduct,
} from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';

type IonName = ComponentProps<typeof Ionicons>['name'];

const ALL_KEY = 'all';

const AISLE_ICONS: Record<string, IonName> = {
  cafe: 'cafe',
  water: 'water',
  nutrition: 'nutrition',
  basket: 'basket',
  leaf: 'leaf',
  'file-tray': 'file-tray',
  sparkles: 'sparkles',
};

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListItem {
  product: MarketplaceProduct;
  qty: number;
}

// ─── Summary drawer ───────────────────────────────────────────────────────────

function SummaryDrawer({
  items,
  onChangeQty,
  frequency,
  onChangeFrequency,
  onSave,
  onDelete,
  saving,
  error,
  existing,
  insetBottom,
}: {
  items: ListItem[];
  onChangeQty: (id: number, delta: number) => void;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  onChangeFrequency: (f: 'weekly' | 'bi-weekly' | 'monthly') => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  error: string | null;
  existing: boolean;
  insetBottom: number;
}) {
  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + Number(i.product.price) * i.qty, 0);

  const [open, setOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: open ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open, drawerAnim]);

  const drawerMaxHeight = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 420],
  });

  if (items.length === 0) return null;

  return (
    <View style={[styles.summaryWrap, { paddingBottom: Math.max(insetBottom + 8, 20) }]}>
      <Animated.View style={[styles.drawerContent, { maxHeight: drawerMaxHeight }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {items.map(({ product, qty }) => (
            <View key={product.id} style={styles.summaryRow}>
              {product.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.summaryThumb} />
              ) : (
                <View style={[styles.summaryThumb, styles.summaryThumbPlaceholder]}>
                  <Ionicons name="basket-outline" size={14} color={FudsColors.mutedForeground} />
                </View>
              )}
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.summaryPrice}>{naira(Number(product.price) * qty)}</Text>
              </View>
              <View style={styles.summaryQtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => onChangeQty(product.id, -1)}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={14} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{qty}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, styles.qtyBtnAdd]}
                  onPress={() => onChangeQty(product.id, 1)}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Frequency & schedule options */}
          <View style={styles.frequencyBox}>
            <View style={styles.frequencyHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={13} color={FudsColors.secondary} />
                <Text style={styles.frequencyTitle}>Frequency</Text>
              </View>
              <View style={styles.frequencyBadge}>
                <Text style={styles.frequencyBadgeText}>Unpaid Ongoing</Text>
              </View>
            </View>
            <View style={styles.frequencyTabs}>
              {(['weekly', 'bi-weekly', 'monthly'] as const).map((f) => {
                const active = frequency === f;
                const label = f === 'bi-weekly' ? 'Bi-Weekly' : f[0].toUpperCase() + f.slice(1);
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqTab, active && styles.freqTabActive]}
                    onPress={() => onChangeFrequency(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.freqTabText, active && styles.freqTabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.frequencyNote}>
              Saved as an ongoing order for you to review and pay when ready. No automatic charges.
            </Text>
          </View>

          {existing && (
            <TouchableOpacity
              style={styles.deleteListBtn}
              onPress={onDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={14} color="#F87171" />
              <Text style={styles.deleteListBtnText}>Delete Market List</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      <TouchableOpacity
        style={styles.summaryBar}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.82}
      >
        <View style={styles.summaryLeft}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>{totalItems}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.summaryLabel}>Market List</Text>
              <View style={styles.freqMiniBadge}>
                <Text style={styles.freqMiniBadgeText}>
                  {frequency === 'bi-weekly' ? 'Bi-Weekly' : frequency[0].toUpperCase() + frequency.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.summaryTotal}>{naira(totalPrice)}</Text>
          </View>
        </View>
        <Ionicons
          name={open ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={FudsColors.primaryForeground}
        />
      </TouchableOpacity>

      {error ? <Text style={styles.summaryError}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.ctaBtn, saving && styles.ctaBtnDisabled]}
        onPress={onSave}
        disabled={saving || items.length === 0}
        activeOpacity={0.88}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.ctaBtnText}>
            {existing ? 'Save Market List' : 'Save Market List'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  qty,
  onAdd,
  onChangeQty,
}: {
  product: MarketplaceProduct;
  qty: number;
  onAdd: () => void;
  onChangeQty: (delta: number) => void;
}) {
  const addScale = useRef(new Animated.Value(1)).current;

  const flash = () => {
    Animated.sequence([
      Animated.timing(addScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(addScale, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAdd = () => {
    flash();
    onAdd();
  };

  const isAdded = qty > 0;

  return (
    <View style={styles.productCard}>
      <Image
        source={{ uri: product.image_url || FudsImages.groceries }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>{naira(Number(product.price))}</Text>
      </View>

      {isAdded ? (
        <View style={styles.productQtyRow}>
          <TouchableOpacity
            style={styles.productQtyBtn}
            onPress={() => onChangeQty(-1)}
            hitSlop={6}
          >
            <Ionicons name="remove" size={13} color={FudsColors.foreground} />
          </TouchableOpacity>
          <Text style={styles.productQtyValue}>{qty}</Text>
          <TouchableOpacity
            style={[styles.productQtyBtn, styles.productQtyBtnActive]}
            onPress={() => onChangeQty(1)}
            hitSlop={6}
          >
            <Ionicons name="add" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ transform: [{ scale: addScale }] }}>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarketListScreen() {
  const insets = useSafeAreaInsets();

  const [aisles, setAisles] = useState<GroceryAisleRead[]>([]);
  const [selectedAisle, setSelectedAisle] = useState<string>(ALL_KEY);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [subscription, setSubscription] = useState<GrocerySubscriptionRead | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load aisles + products whenever filter changes
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aisleRows, catalog] = await Promise.all([
        marketplaceApi.listAisles().catch(() => [] as GroceryAisleRead[]),
        marketplaceApi.getCatalog({
          aisle: selectedAisle === ALL_KEY ? undefined : selectedAisle,
        }),
      ]);
      setAisles(aisleRows.length ? aisleRows : catalog.aisles);
      setProducts(catalog.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load products');
    } finally {
      setLoading(false);
    }
  }, [selectedAisle]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pre-load existing subscription once on mount
  useEffect(() => {
    let active = true;
    marketplaceApi
      .listShoppingLists()
      .then((lists) => {
        if (!active) return;
        const current = lists[0] ?? null;
        setSubscription(current);
        if (current) {
          if (current.frequency) {
            setFrequency((current.frequency as 'weekly' | 'bi-weekly' | 'monthly') || 'weekly');
          }
          const qtyMap: Record<number, number> = {};
          current.items.forEach((item) => {
            qtyMap[item.product_id] = item.quantity;
          });
          setQuantities(qtyMap);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Product cache across filter changes (so summary can show products not in current view)
  const productCacheRef = useRef<Record<number, MarketplaceProduct>>({});
  useEffect(() => {
    products.forEach((p) => {
      productCacheRef.current[p.id] = p;
    });
  }, [products]);

  const setQty = (productId: number, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[productId] ?? 0) + delta);
      if (next === 0) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }
      return { ...prev, [productId]: next };
    });
  };

  const addProduct = (productId: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  };

  const listItems: ListItem[] = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({
      product: productCacheRef.current[Number(id)],
      qty,
    }))
    .filter((item): item is ListItem => !!item.product);

  const handleSave = async () => {
    if (listItems.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const items = listItems.map(({ product, qty }) => ({
        product_id: product.id,
        quantity: qty,
      }));
      const saved = subscription
        ? await marketplaceApi.updateShoppingList(subscription.id, { items, frequency })
        : await marketplaceApi.createShoppingList(items, frequency);

      // Ensure the unpaid order is created/updated so it appears under Ongoing immediately:
      await marketplaceApi.checkoutShoppingList(saved.id);
      setSubscription(saved);

      Alert.alert(
        'Market List Saved',
        'Your market list is now saved under Ongoing as an unpaid order. You can edit it or review & pay whenever you are ready.',
        [
          {
            text: 'View in Ongoing',
            onPress: () => {
              router.replace({
                pathname: '/(app)/(tabs)/orders' as any,
                params: { tab: 'ongoing' },
              });
            },
          },
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => safeGoBack('/(app)/marketplace'),
          },
        ]
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save list');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!subscription) return;
    Alert.alert(
      'Delete Market List',
      'Are you sure you want to delete this market list? Any unpaid order for this list will be cancelled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            setSaveError(null);
            try {
              await marketplaceApi.cancelShoppingList(subscription.id);
              setSubscription(null);
              setQuantities({});
              safeGoBack('/(app)/marketplace');
            } catch (err) {
              setSaveError(err instanceof Error ? err.message : 'Could not delete list');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const selectedAisleLabel =
    selectedAisle === ALL_KEY
      ? 'All'
      : aisles.find((a) => a.key === selectedAisle)?.label ?? 'Aisle';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeGoBack('/(app)/marketplace')}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={18} color={FudsColors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Create Market List</Text>
          <Text style={styles.headerSub}>
            Build your list from products across the marketplace.
          </Text>
        </View>
        {listItems.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{listItems.length}</Text>
          </View>
        )}
      </View>

      {/* Category chips */}
      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.chip, selectedAisle === ALL_KEY && styles.chipActive]}
            onPress={() => setSelectedAisle(ALL_KEY)}
            activeOpacity={0.78}
          >
            <Ionicons
              name="grid-outline"
              size={13}
              color={selectedAisle === ALL_KEY ? '#fff' : FudsColors.primary}
            />
            <Text style={[styles.chipText, selectedAisle === ALL_KEY && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {aisles.map((aisle) => (
            <TouchableOpacity
              key={aisle.key}
              style={[styles.chip, selectedAisle === aisle.key && styles.chipActive]}
              onPress={() => setSelectedAisle(aisle.key)}
              activeOpacity={0.78}
            >
              <Ionicons
                name={AISLE_ICONS[aisle.icon] ?? 'basket-outline'}
                size={13}
                color={selectedAisle === aisle.key ? '#fff' : FudsColors.primary}
              />
              <Text
                style={[
                  styles.chipText,
                  selectedAisle === aisle.key && styles.chipTextActive,
                ]}
              >
                {aisle.label}
              </Text>
              {aisle.product_count > 0 && (
                <View
                  style={[
                    styles.chipCount,
                    selectedAisle === aisle.key && styles.chipCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipCountText,
                      selectedAisle === aisle.key && styles.chipCountTextActive,
                    ]}
                  >
                    {aisle.product_count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{selectedAisleLabel}</Text>
        {!loading && (
          <Text style={styles.sectionCount}>
            {products.length} item{products.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Product grid */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={FudsColors.primary} size="large" />
          <Text style={styles.loadingText}>Loading products…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={32} color={FudsColors.destructive} />
          <Text style={styles.errorTitle}>Could not load products</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="basket-outline" size={40} color={FudsColors.muted} />
          <Text style={styles.emptyTitle}>No products here</Text>
          <Text style={styles.emptyDetail}>Try a different category.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: listItems.length > 0 ? 200 : BottomTabInset },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              qty={quantities[item.id] ?? 0}
              onAdd={() => addProduct(item.id)}
              onChangeQty={(delta) => setQty(item.id, delta)}
            />
          )}
        />
      )}

      {/* Summary footer */}
      <SummaryDrawer
        items={listItems}
        onChangeQty={setQty}
        frequency={frequency}
        onChangeFrequency={setFrequency}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
        error={saveError}
        existing={!!subscription}
        insetBottom={insets.bottom}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingTop: 4,
    paddingBottom: 10,
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
  headerTitle: { fontSize: 16, fontWeight: '900', color: FudsColors.foreground },
  headerSub: { fontSize: 11, fontWeight: '600', color: FudsColors.mutedForeground, marginTop: 1 },
  headerBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { fontSize: 12, fontWeight: '900', color: '#fff' },

  chipsWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FudsColors.border,
    marginBottom: 4,
  },
  chipsScroll: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: FudsRadius.full,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    backgroundColor: FudsColors.card,
  },
  chipActive: {
    backgroundColor: FudsColors.primary,
    borderColor: FudsColors.primary,
    ...FudsShadow.sm,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: FudsColors.foreground },
  chipTextActive: { color: '#fff' },
  chipCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: FudsColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 10, fontWeight: '900', color: FudsColors.primary },
  chipCountTextActive: { color: '#fff' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: FudsColors.foreground },
  sectionCount: { fontSize: 11, fontWeight: '700', color: FudsColors.mutedForeground },

  grid: { paddingHorizontal: Spacing.three },
  columnWrap: { gap: 8, marginBottom: 8 },
  productCard: {
    flex: 1,
    maxWidth: '32%',
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.md,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  productImage: { width: '100%', height: 72, backgroundColor: FudsColors.muted },
  productBody: { flex: 1, paddingHorizontal: 6, paddingTop: 6 },
  productName: {
    fontSize: 11,
    fontWeight: '800',
    color: FudsColors.foreground,
    minHeight: 28,
    lineHeight: 14,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: FudsColors.primary,
    marginTop: 2,
    marginBottom: 6,
  },
  addBtn: {
    alignSelf: 'flex-end',
    marginRight: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  productQtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: FudsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FudsColors.background,
  },
  productQtyBtnActive: {
    backgroundColor: FudsColors.primary,
    borderColor: FudsColors.primary,
  },
  productQtyValue: {
    fontSize: 13,
    fontWeight: '900',
    color: FudsColors.foreground,
    minWidth: 18,
    textAlign: 'center',
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 10, fontSize: 13, fontWeight: '700', color: FudsColors.mutedForeground },
  errorTitle: { marginTop: 10, fontSize: 14, fontWeight: '900', color: FudsColors.foreground, textAlign: 'center' },
  errorDetail: { marginTop: 4, fontSize: 12, color: FudsColors.mutedForeground, textAlign: 'center', lineHeight: 18 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: FudsRadius.md, backgroundColor: FudsColors.primary },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  emptyTitle: { marginTop: 12, fontSize: 14, fontWeight: '900', color: FudsColors.foreground, textAlign: 'center' },
  emptyDetail: { marginTop: 4, fontSize: 12, color: FudsColors.mutedForeground, textAlign: 'center' },

  summaryWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: FudsColors.foreground,
    borderTopLeftRadius: FudsRadius.xl,
    borderTopRightRadius: FudsRadius.xl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    ...FudsShadow.md,
  },
  drawerContent: { overflow: 'hidden' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  summaryThumb: { width: 38, height: 38, borderRadius: FudsRadius.sm, backgroundColor: 'rgba(255,255,255,0.1)' },
  summaryThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1 },
  summaryName: { fontSize: 12, fontWeight: '800', color: '#fff' },
  summaryPrice: { fontSize: 11, fontWeight: '700', color: FudsColors.secondary, marginTop: 2 },
  summaryQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnAdd: { backgroundColor: FudsColors.primary, borderColor: FudsColors.primary },
  qtyValue: { fontSize: 13, fontWeight: '900', color: '#fff', minWidth: 16, textAlign: 'center' },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  summaryBadgeText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  summaryLabel: { fontSize: 14, fontWeight: '900', color: '#fff' },
  summaryTotal: { fontSize: 13, fontWeight: '800', color: FudsColors.secondary },
  summaryError: { fontSize: 11, fontWeight: '700', color: '#FCA5A5', textAlign: 'center', marginBottom: 6 },

  ctaBtn: {
    backgroundColor: FudsColors.primary,
    borderRadius: FudsRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...FudsShadow.sm,
  },
  ctaBtnDisabled: { opacity: 0.55 },
  ctaBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },

  frequencyBox: {
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: FudsRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  frequencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  frequencyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  frequencyBadge: {
    backgroundColor: 'rgba(29,158,117,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: FudsRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.4)',
  },
  frequencyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: FudsColors.secondary,
  },
  frequencyTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  freqTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: FudsRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqTabActive: {
    backgroundColor: FudsColors.primary,
    borderColor: FudsColors.primary,
  },
  freqTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  freqTabTextActive: {
    color: '#fff',
  },
  frequencyNote: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    lineHeight: 14,
  },
  deleteListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    borderRadius: FudsRadius.sm,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  deleteListBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F87171',
  },
  freqMiniBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: FudsRadius.full,
  },
  freqMiniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: FudsColors.secondary,
  },
});
