/**
 * Pick meals for a 111 slot (breakfast / lunch / dinner).
 *
 * UX:
 *  - Users can add multiple meals without the screen closing.
 *  - Each meal card shows a `+` button when qty = 0, or `− qty +` controls.
 *  - Quantity changes are optimistic (instant UI) with background API calls.
 *  - A sticky footer shows the total item count and a "Done" button.
 */

import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  formatNaira,
  formatSlotLabel,
  getMealWindow,
  type MealType,
} from '@/constants/schedule';
import { FudsColors, FudsImages, FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
import { browseApi, scheduleApi, type ProductWithVendor } from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

function asMealType(value: string | undefined): MealType {
  return MEAL_TYPES.includes(value as MealType) ? (value as MealType) : 'lunch';
}

// ─── Squishy animated button ─────────────────────────────────────────────────

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function SquishBtn({
  onPress,
  children,
  style,
  disabled,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.78, { damping: 18, stiffness: 480, mass: 0.6 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 11, stiffness: 300, mass: 0.6 });
  };

  return (
    <AnimatedTouchable
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedTouchable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PickMealScreen() {
  const params = useLocalSearchParams<{ meal_type?: string; date?: string; time?: string }>();
  const mealType = asMealType(params.meal_type);
  const date = String(params.date ?? '');
  const time = String(params.time ?? '');
  const window = getMealWindow(mealType);

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Local quantity map: productId → quantity selected in this session.
   * This is optimistic state — updated immediately, synced to server in background.
   */
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  /**
   * Per-product scheduled meal ID returned by the backend after the first upsert.
   * Needed to call update/remove on subsequent changes.
   */
  const mealIdRef = useRef<Record<number, number>>({});

  /** Tracks in-flight network ops so we can debounce rapid taps gracefully. */
  const pendingRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const totalItems = Object.values(quantities).reduce((s, q) => s + q, 0);
  const uniqueMeals = Object.values(quantities).filter((q) => q > 0).length;

  const load = useCallback(async (search: string) => {
    setError(null);
    try {
      const rows = search.trim()
        ? await browseApi.searchMeals(search.trim(), { limit: 30, group: 'food' })
        : await browseApi.listProducts({ group: 'food', limit: 40 });
      setProducts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load meals');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const delay = query.trim() ? 280 : 0;
    const handle = setTimeout(async () => {
      if (!query.trim()) setLoading(true);
      await load(query);
      if (alive) setLoading(false);
    }, delay);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [query, load]);

  // ── Quantity helpers ────────────────────────────────────────────────────────

  const syncToServer = useCallback(
    (product: ProductWithVendor, targetQty: number) => {
      // Cancel any pending debounced call for this product
      if (pendingRef.current[product.id]) {
        clearTimeout(pendingRef.current[product.id]);
      }

      pendingRef.current[product.id] = setTimeout(async () => {
        try {
          if (!date || !time) return;

          if (targetQty <= 0) {
            const mealId = mealIdRef.current[product.id];
            if (mealId != null) {
              await scheduleApi.remove(mealId);
              delete mealIdRef.current[product.id];
            }
          } else {
            const mealId = mealIdRef.current[product.id];
            if (mealId != null) {
              await scheduleApi.update(mealId, { quantity: targetQty });
            } else {
              const created = await scheduleApi.upsert({
                meal_type: mealType,
                delivery_date: date,
                slot_time: time,
                product_id: product.id,
                quantity: targetQty,
              });
              mealIdRef.current[product.id] = created.id;
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not save meal selection');
          // Revert optimistic update on error
          setQuantities((prev) => {
            const next = { ...prev };
            if (next[product.id] === targetQty) {
              // Still at the target that failed — revert
              if (targetQty <= 0) {
                delete next[product.id];
              } else {
                next[product.id] = targetQty - 1;
              }
            }
            return next;
          });
        }
      }, 220);
    },
    [date, time, mealType]
  );

  const handleAdd = useCallback(
    (product: ProductWithVendor) => {
      setQuantities((prev) => {
        const next = { ...prev, [product.id]: (prev[product.id] ?? 0) + 1 };
        syncToServer(product, next[product.id]);
        return next;
      });
    },
    [syncToServer]
  );

  const handleRemove = useCallback(
    (product: ProductWithVendor) => {
      setQuantities((prev) => {
        const cur = prev[product.id] ?? 0;
        const nextQty = Math.max(0, cur - 1);
        const next = { ...prev };
        if (nextQty === 0) {
          delete next[product.id];
        } else {
          next[product.id] = nextQty;
        }
        syncToServer(product, nextQty);
        return next;
      });
    },
    [syncToServer]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeGoBack('/(app)/(tabs)/schedule')}
        >
          <Ionicons name="arrow-back" size={20} color={FudsColors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Add {window.label.toLowerCase()}</Text>
          <Text style={styles.sub}>
            {window.label} · {formatSlotLabel(time)} · {date}
          </Text>
        </View>
        {totalItems > 0 && (
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={FudsColors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search jollof, suya, amala…"
          placeholderTextColor={FudsColors.mutedForeground}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={FudsColors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={FudsColors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            // Extra bottom padding when sticky footer is visible
            totalItems > 0 && { paddingBottom: 120 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No meals match that search.</Text>
          }
          renderItem={({ item }) => {
            const qty = quantities[item.id] ?? 0;
            return (
              <View style={styles.row}>
                <Image
                  source={{ uri: item.image_url || FudsImages.jollof }}
                  style={styles.thumb}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.vendor} numberOfLines={1}>
                    {item.vendor_name ?? 'Restaurant'}
                  </Text>
                  <Text style={styles.price}>{formatNaira(item.price)}</Text>
                </View>

                {/* Quantity control */}
                {qty === 0 ? (
                  <SquishBtn style={styles.addBtn} onPress={() => handleAdd(item)}>
                    <Ionicons name="add" size={20} color={FudsColors.primaryForeground} />
                  </SquishBtn>
                ) : (
                  <View style={styles.qtyRow}>
                    <SquishBtn
                      style={[
                        styles.qtyBtn,
                        qty === 1 && styles.qtyBtnRemove,
                      ]}
                      onPress={() => handleRemove(item)}
                    >
                      <Ionicons
                        name={qty === 1 ? 'trash-outline' : 'remove'}
                        size={16}
                        color={qty === 1 ? FudsColors.destructive : FudsColors.primary}
                      />
                    </SquishBtn>

                    <Text style={styles.qtyText}>{qty}</Text>

                    <SquishBtn style={styles.addBtn} onPress={() => handleAdd(item)}>
                      <Ionicons name="add" size={18} color={FudsColors.primaryForeground} />
                    </SquishBtn>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Sticky footer — only visible once ≥1 meal selected */}
      {totalItems > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerCount}>
                {uniqueMeals} meal{uniqueMeals !== 1 ? 's' : ''} selected
              </Text>
              <Text style={styles.footerItems}>
                {totalItems} total item{totalItems !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.doneBtn}
              activeOpacity={0.85}
              onPress={() => safeGoBack('/(app)/(tabs)/schedule')}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },

  // Nav
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: FudsColors.foreground },
  sub: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 2, fontWeight: '600' },

  // Badge in header
  badgePill: {
    backgroundColor: FudsColors.primary,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgePillText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  // Search
  search: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.md,
    borderWidth: 1,
    borderColor: FudsColors.border,
    paddingHorizontal: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: FudsColors.foreground, fontWeight: '600' },

  // Error
  errorBox: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    backgroundColor: '#FEE2E2',
    borderRadius: FudsRadius.md,
    padding: 12,
  },
  errorText: { color: FudsColors.destructive, fontSize: 13, fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // List
  list: { paddingHorizontal: Spacing.three, paddingBottom: 40, gap: 10 },
  empty: {
    textAlign: 'center',
    color: FudsColors.mutedForeground,
    marginTop: 40,
    fontWeight: '600',
  },

  // Meal row card
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.lg,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: 10,
    ...FudsShadow.sm,
  },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: FudsColors.muted },
  name: { fontSize: 15, fontWeight: '800', color: FudsColors.foreground },
  vendor: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 2, fontWeight: '600' },
  price: { fontSize: 13, fontWeight: '800', color: FudsColors.primary, marginTop: 4 },

  // Add button (qty = 0)
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Qty controls (qty > 0)
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnRemove: {
    backgroundColor: '#FEE2E2',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '900',
    color: FudsColors.foreground,
    minWidth: 20,
    textAlign: 'center',
  },

  // Sticky Done footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: FudsColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: FudsColors.border,
    ...FudsShadow.md,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
  },
  footerInfo: { gap: 2 },
  footerCount: { fontSize: 15, fontWeight: '800', color: FudsColors.foreground },
  footerItems: { fontSize: 12, color: FudsColors.mutedForeground, fontWeight: '600' },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FudsColors.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: FudsRadius.md,
    ...FudsShadow.sm,
  },
  doneBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
});
