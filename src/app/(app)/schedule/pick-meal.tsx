/**
 * Pick a meal for a 111 slot (breakfast / lunch / dinner).
 */

import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
  const [addingId, setAddingId] = useState<number | null>(null);

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

  const pick = async (product: ProductWithVendor) => {
    if (!date || !time) {
      setError('Missing delivery date or time');
      return;
    }
    setAddingId(product.id);
    setError(null);
    try {
      await scheduleApi.upsert({
        meal_type: mealType,
        delivery_date: date,
        slot_time: time,
        product_id: product.id,
        quantity: 1,
      });
      safeGoBack('/(app)/(tabs)/schedule');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this meal');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeGoBack('/(app)/(tabs)/schedule')}>
          <Ionicons name="arrow-back" size={20} color={FudsColors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Add {window.label.toLowerCase()}</Text>
          <Text style={styles.sub}>
            {window.label} · {formatSlotLabel(time)} · {date}
          </Text>
        </View>
      </View>

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
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={FudsColors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No meals match that search.</Text>
          }
          renderItem={({ item }) => {
            const busy = addingId === item.id;
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.88}
                onPress={() => pick(item)}
                disabled={addingId != null}
              >
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
                <View style={styles.addBtn}>
                  {busy ? (
                    <ActivityIndicator size="small" color={FudsColors.primaryForeground} />
                  ) : (
                    <Ionicons name="add" size={18} color={FudsColors.primaryForeground} />
                  )}
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
  errorBox: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    backgroundColor: '#FEE2E2',
    borderRadius: FudsRadius.md,
    padding: 12,
  },
  errorText: { color: FudsColors.destructive, fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.three, paddingBottom: 40, gap: 10 },
  empty: {
    textAlign: 'center',
    color: FudsColors.mutedForeground,
    marginTop: 40,
    fontWeight: '600',
  },
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
