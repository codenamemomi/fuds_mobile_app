/**
 * FUDS Marketplace — compact grocery aisles, quantity picker, animated hero.
 */

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  type GrocerySubscriptionRead,
  type MarketplaceProduct,
} from '@/lib/api';
import { router } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';

type IonName = ComponentProps<typeof Ionicons>['name'];

const ALL_AISLE = 'all';
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
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [picked, setPicked] = useState<MarketplaceProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [essentialSearch, setEssentialSearch] = useState('');
  const [essentials, setEssentials] = useState<MarketplaceProduct[]>([]);
  const [selectedEssentialIds, setSelectedEssentialIds] = useState<Set<number>>(new Set());
  const [essentialQuantities, setEssentialQuantities] = useState<Record<number, number>>({});
  const [essentialsLoading, setEssentialsLoading] = useState(false);
  const [savingShoppingList, setSavingShoppingList] = useState(false);
  const [shoppingListError, setShoppingListError] = useState<string | null>(null);
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [subscription, setSubscription] = useState<GrocerySubscriptionRead | null>(null);

  const heroIndex = useRef(0);
  const lineIndex = useRef(0);
  const imageOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const titleY = useRef(new Animated.Value(0)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const modalSheetY = useRef(new Animated.Value(80)).current;
  const listBackdropOpacity = useRef(new Animated.Value(0)).current;
  const listSheetY = useRef(new Animated.Value(300)).current;
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

  useEffect(() => {
    if (shoppingListOpen) {
      listBackdropOpacity.setValue(0);
      listSheetY.setValue(300);
      Animated.parallel([
        Animated.timing(listBackdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(listSheetY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(listBackdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(listSheetY, {
          toValue: 300,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shoppingListOpen, listBackdropOpacity, listSheetY]);

  const loadCatalog = useCallback(async () => {
    try {
      setError(null);
      const [aisleRows, catalog] = await Promise.all([
        marketplaceApi.listAisles().catch(() => []),
        marketplaceApi.getCatalog({
          aisle: selectedAisle === ALL_AISLE ? undefined : selectedAisle,
          search: search.trim() || undefined,
        }),
      ]);
      setAisles(aisleRows.length ? aisleRows : catalog.aisles);
      setProducts(catalog.products);
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

  useEffect(() => {
    if (!shoppingListOpen) return;
    let active = true;
    const timer = setTimeout(async () => {
      setEssentialsLoading(true);
      setShoppingListError(null);
      try {
        const [rows, subscriptions] = await Promise.all([
          marketplaceApi.listEssentials(essentialSearch.trim() || undefined),
          marketplaceApi.listShoppingLists(),
        ]);
        if (active) setEssentials(rows);
        const current = subscriptions[0] ?? null;
        if (active && current && !essentialSearch.trim()) {
          setSubscription(current);
          setSubscriptionFrequency(current.frequency as 'weekly' | 'bi-weekly' | 'monthly');
          setSelectedEssentialIds(new Set(current.items.map((item) => item.product_id)));
          setEssentialQuantities(
            Object.fromEntries(current.items.map((item) => [item.product_id, item.quantity]))
          );
        }
      } catch (err) {
        if (active) setShoppingListError(err instanceof Error ? err.message : 'Could not load essentials');
      } finally {
        if (active) setEssentialsLoading(false);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [essentialSearch, shoppingListOpen]);

  const openSubscriptionEditor = () => {
    setShoppingListError(null);
    setShoppingListOpen(true);
  };

  const openQty = (product: MarketplaceProduct) => {
    setPicked(product);
    setQty(1);
  };

  const addToCart = async () => {
    if (!picked) return;
    setAdding(true);
    try {
      await cartApi.addItem({
        marketplace_product_id: picked.id,
        quantity: qty,
      });
      setPicked(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const toggleEssential = (productId: number) => {
    setSelectedEssentialIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
        setEssentialQuantities((quantities) => ({ ...quantities, [productId]: 0 }));
      } else {
        next.add(productId);
        setEssentialQuantities((quantities) => ({
          ...quantities,
          [productId]: quantities[productId] > 0 ? quantities[productId] : 1,
        }));
      }
      return next;
    });
  };

  const changeEssentialQuantity = (productId: number, delta: number) => {
    setEssentialQuantities((quantities) => {
      const nextQuantity = Math.max(0, Math.min(50, (quantities[productId] ?? 0) + delta));
      setSelectedEssentialIds((selected) => {
        const next = new Set(selected);
        if (nextQuantity === 0) next.delete(productId);
        else next.add(productId);
        return next;
      });
      return { ...quantities, [productId]: nextQuantity };
    });
  };

  const createShoppingList = async () => {
    if (!selectedEssentialIds.size) return;
    setSavingShoppingList(true);
    setShoppingListError(null);
    try {
      const items = Array.from(selectedEssentialIds, (product_id) => ({
        product_id,
        quantity: essentialQuantities[product_id] ?? 1,
      }));
      const saved = subscription
        ? await marketplaceApi.updateShoppingList(subscription.id, { items, frequency: subscriptionFrequency })
        : await marketplaceApi.createShoppingList(items, subscriptionFrequency);
      setSubscription(saved);
      setShoppingListOpen(false);
      setSelectedEssentialIds(new Set());
      setEssentialSearch('');
    } catch (err) {
      setShoppingListError(err instanceof Error ? err.message : 'Could not create shopping list');
    } finally {
      setSavingShoppingList(false);
    }
  };

  const deleteSubscription = async () => {
    if (!subscription) return;
    setSavingShoppingList(true);
    setShoppingListError(null);
    try {
      await marketplaceApi.cancelShoppingList(subscription.id);
      setSubscription(null);
      setSelectedEssentialIds(new Set());
      setEssentialQuantities({});
      setEssentialSearch('');
      setShoppingListOpen(false);
    } catch (err) {
      setShoppingListError(err instanceof Error ? err.message : 'Could not delete shopping list');
    } finally {
      setSavingShoppingList(false);
    }
  };

  const selectedLabel =
    selectedAisle === ALL_AISLE
      ? 'All aisles'
      : aisles.find((a) => a.key === selectedAisle)?.label ?? 'Aisle';
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeGoBack('/(app)/(tabs)/')}>
          <Ionicons name="arrow-back" size={18} color={FudsColors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Maketplace</Text>
          <Text style={styles.subtitle}>Groceries & essentials</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <Animated.Image source={{ uri: heroImage }} style={[styles.heroBg, { opacity: imageOpacity }]} />
        <View style={styles.heroScrim} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroBadge}>FUDS MAKETPLACE</Text>
          <Animated.Text style={[styles.heroTitle, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
            {heroLine}
          </Animated.Text>
        </View>
        <TouchableOpacity
          style={styles.shoppingListButton}
          onPress={() => router.push('/(app)/market-list' as any)}
          activeOpacity={0.86}
        >
          <Ionicons name="list" size={17} color="#fff" />
          <Text style={styles.shoppingListButtonText}>Create Maket List</Text>
        </TouchableOpacity>
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
          contentContainerStyle={styles.grid}
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
            <FudsButton label={adding ? 'Adding…' : 'Add to cart'} loading={adding} onPress={addToCart} />
            <TouchableOpacity onPress={() => setPicked(null)} style={styles.qtyCancel}>
              <Text style={styles.qtyCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={shoppingListOpen}
        transparent
        animationType="none"
        onRequestClose={() => setShoppingListOpen(false)}
      >
        <View style={styles.modalScrim}>
          <Animated.View
            style={[styles.modalBackdrop, { opacity: listBackdropOpacity }]}
            pointerEvents="box-none"
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShoppingListOpen(false)} />
          </Animated.View>
          <Animated.View
            style={[
              styles.listSheet,
              { paddingBottom: Math.max(insets.bottom + 12, 28), transform: [{ translateY: listSheetY }] },
            ]}
          >
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.sheetTitle}>Subscribe to grocery shopping</Text>
                <Text style={styles.sheetSub}>Pick essentials and choose how often FUDS should prepare them.</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShoppingListOpen(false)}>
                <Ionicons name="close" size={20} color={FudsColors.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={styles.frequencyLabel}>Repeat groceries</Text>
            <View style={styles.frequencyRow}>
              {(['weekly', 'bi-weekly', 'monthly'] as const).map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[styles.frequencyButton, subscriptionFrequency === frequency && styles.frequencyButtonActive]}
                  onPress={() => setSubscriptionFrequency(frequency)}
                >
                  <Text style={[styles.frequencyText, subscriptionFrequency === frequency && styles.frequencyTextActive]}>
                    {frequency === 'bi-weekly' ? 'Bi-weekly' : frequency[0].toUpperCase() + frequency.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.listSearchWrap}>
              <Ionicons name="search" size={16} color={FudsColors.mutedForeground} />
              <TextInput
                value={essentialSearch}
                onChangeText={setEssentialSearch}
                placeholder="Search essentials"
                placeholderTextColor={FudsColors.mutedForeground}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {shoppingListError ? <Text style={styles.errorText}>{shoppingListError}</Text> : null}
            {essentialsLoading ? (
              <View style={styles.listLoading}><ActivityIndicator color={FudsColors.primary} /></View>
            ) : (
              <FlatList
                data={essentials}
                keyExtractor={(item) => String(item.id)}
                style={styles.essentialList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.emptyText}>No essentials found.</Text>}
                renderItem={({ item }) => {
                  const selected = selectedEssentialIds.has(item.id);
                  const quantity = selected ? Math.max(1, essentialQuantities[item.id] ?? 1) : 0;
                  return (
                    <View style={[styles.essentialRow, selected && styles.essentialRowSelected]}>
                      <TouchableOpacity
                        style={[styles.checkCircle, selected && styles.checkCircleSelected]}
                        onPress={() => toggleEssential(item.id)}
                        hitSlop={8}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                      </TouchableOpacity>
                      <View style={styles.essentialCopy}>
                        <Text style={styles.essentialName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.essentialMeta}>{item.aisle || 'Essential'} · {naira(Number(item.price))}</Text>
                      </View>
                      <View style={styles.essentialQuantity}>
                        <TouchableOpacity
                          style={styles.essentialQuantityButton}
                          onPress={() => changeEssentialQuantity(item.id, -1)}
                          hitSlop={6}
                        >
                          <Ionicons name="remove" size={14} color={FudsColors.foreground} />
                        </TouchableOpacity>
                        <Text style={styles.essentialQuantityValue}>{quantity}</Text>
                        <TouchableOpacity
                          style={[styles.essentialQuantityButton, styles.essentialQuantityButtonActive]}
                          onPress={() => changeEssentialQuantity(item.id, 1)}
                          hitSlop={6}
                        >
                          <Ionicons name="add" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
            {subscription ? (
              <TouchableOpacity style={styles.deleteListButton} onPress={deleteSubscription} disabled={savingShoppingList}>
                <Ionicons name="trash-outline" size={15} color={FudsColors.destructive} />
                <Text style={styles.deleteListButtonText}>Delete shopping list</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.createListButton, !selectedEssentialIds.size && styles.createListButtonDisabled]}
              onPress={createShoppingList}
              disabled={!selectedEssentialIds.size || savingShoppingList}
            >
              {savingShoppingList ? <ActivityIndicator color="#fff" /> : <Text style={styles.createListButtonText}>{subscription ? 'Save changes' : 'Create subscription'} ({selectedEssentialIds.size})</Text>}
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
  heroBg: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 80, 65, 0.48)',
  },
  heroCopy: { paddingHorizontal: 12, paddingBottom: 10, paddingRight: 108 },
  heroBadge: { color: FudsColors.secondary, fontWeight: '800', fontSize: 9, letterSpacing: 0.8 },
  heroTitle: { marginTop: 4, fontSize: 18, fontWeight: '900', color: '#fff' },
  shoppingListButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: FudsColors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...FudsShadow.sm,
  },
  shoppingListButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  frequencyLabel: { marginTop: 8, color: FudsColors.foreground, fontSize: 12, fontWeight: '800' },
  frequencyRow: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 4 },
  frequencyButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: FudsColors.border, borderRadius: 10, paddingVertical: 9 },
  frequencyButtonActive: { backgroundColor: FudsColors.primary, borderColor: FudsColors.primary },
  frequencyText: { color: FudsColors.foreground, fontSize: 11, fontWeight: '800' },
  frequencyTextActive: { color: FudsColors.primaryForeground },
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
    ...StyleSheet.absoluteFill,
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
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
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
  listSheet: { maxHeight: '82%', backgroundColor: FudsColors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  listHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  closeButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: FudsColors.background, alignItems: 'center', justifyContent: 'center' },
  listSearchWrap: { flexDirection: 'row', alignItems: 'center', height: 42, marginTop: 10, marginBottom: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: FudsColors.border, borderRadius: 12, backgroundColor: FudsColors.background },
  listLoading: { height: 220, alignItems: 'center', justifyContent: 'center' },
  essentialList: { maxHeight: 310 },
  essentialRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: FudsColors.border, borderRadius: 10 },
  essentialRowSelected: { backgroundColor: 'rgba(29,158,117,0.12)' },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: FudsColors.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkCircleSelected: { backgroundColor: FudsColors.primary, borderColor: FudsColors.primary },
  essentialCopy: { flex: 1 },
  essentialName: { color: FudsColors.foreground, fontSize: 13, fontWeight: '800' },
  essentialMeta: { color: FudsColors.mutedForeground, fontSize: 11, fontWeight: '600', marginTop: 2 },
  essentialQuantity: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  essentialQuantityButton: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: FudsColors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: FudsColors.background },
  essentialQuantityButtonActive: { backgroundColor: FudsColors.primary, borderColor: FudsColors.primary },
  essentialQuantityValue: { minWidth: 16, textAlign: 'center', color: FudsColors.foreground, fontSize: 13, fontWeight: '900' },
  createListButton: { minHeight: 46, marginTop: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: FudsColors.primary },
  deleteListButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 9 },
  deleteListButtonText: { color: FudsColors.destructive, fontSize: 12, fontWeight: '800' },
  createListButtonDisabled: { opacity: 0.45 },
  createListButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
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
