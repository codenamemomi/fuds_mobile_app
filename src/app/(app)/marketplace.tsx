/**
 * FUDS Marketplace — grocery essentials and household shopping.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { FudsColors, FudsImages, FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
import { marketplaceApi, type GroceryAisleRead, type ProductWithVendor } from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';

const ALL_AISLE = 'all';

export default function MarketplaceScreen() {
  const [aisles, setAisles] = useState<GroceryAisleRead[]>([]);
  const [selectedAisle, setSelectedAisle] = useState<string>(ALL_AISLE);
  const [products, setProducts] = useState<ProductWithVendor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setAisles(aisleRows);
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
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadCatalog]);

  const highlight = useMemo(() => {
    const total = products.reduce((sum, product) => sum + Number(product.price || 0), 0);
    return total > 0 ? `₦${(total / Math.max(products.length, 1)).toFixed(0)}` : '₦0';
  }, [products]);

  const openVendor = (product: ProductWithVendor) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/(app)/vendor/${product.vendor_id}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeGoBack('/(app)/(tabs)/')}>
          <Ionicons name="arrow-back" size={20} color={FudsColors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>FUDS Market place</Text>
          <Text style={styles.subtitle}>Fresh essentials curated for your home</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroBadge}>FUDS MARKET PLACE</Text>
          <Text style={styles.heroTitle}>Pay less, shop smarter</Text>
          <Text style={styles.heroSub}>Fresh groceries, pantry staples, and home essentials.</Text>
        </View>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatLabel}>Avg basket</Text>
          <Text style={styles.heroStatValue}>{highlight}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={FudsColors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search aisles or groceries…"
          placeholderTextColor={FudsColors.mutedForeground}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, selectedAisle === ALL_AISLE && styles.chipActive]}
          onPress={() => setSelectedAisle(ALL_AISLE)}
        >
          <Text style={[styles.chipText, selectedAisle === ALL_AISLE && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {aisles.map((aisle) => (
          <TouchableOpacity
            key={aisle.key}
            style={[styles.chip, selectedAisle === aisle.key && styles.chipActive]}
            onPress={() => setSelectedAisle(aisle.key)}
          >
            <Text style={[styles.chipText, selectedAisle === aisle.key && styles.chipTextActive]}>
              {aisle.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={FudsColors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.columnWrap}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="basket-outline" size={36} color={FudsColors.mutedForeground} />
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptyText}>Try another aisle or search term.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              activeOpacity={0.9}
              onPress={() => openVendor(item)}
            >
              <Image
                source={{ uri: item.image_url || FudsImages.groceries }}
                style={styles.productImage}
              />
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productVendor} numberOfLines={1}>{item.vendor_name || 'FUDS vendor'}</Text>
                <View style={styles.productMeta}>
                  <Text style={styles.productPrice}>₦{Number(item.price).toLocaleString()}</Text>
                  <View style={styles.shopPill}>
                    <Ionicons name="storefront-outline" size={12} color={FudsColors.primaryForeground} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingTop: 8,
    paddingBottom: 10,
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
  title: { fontSize: 22, fontWeight: '900', color: FudsColors.foreground },
  subtitle: { color: FudsColors.mutedForeground, fontSize: 12, fontWeight: '600', marginTop: 2 },
  heroCard: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: '#EAFBEF',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#C7EAD8',
    ...FudsShadow.sm,
  },
  heroTextWrap: { flex: 1, paddingRight: 8 },
  heroBadge: { color: FudsColors.primary, fontWeight: '800', fontSize: 11, letterSpacing: 0.8 },
  heroTitle: { marginTop: 8, fontSize: 26, fontWeight: '900', color: FudsColors.foreground },
  heroSub: { marginTop: 6, fontSize: 12, color: FudsColors.mutedForeground, fontWeight: '600' },
  heroStat: {
    backgroundColor: FudsColors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minWidth: 96,
    alignItems: 'center',
  },
  heroStatLabel: { color: '#DFF8EE', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  heroStatValue: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  searchWrap: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
    borderRadius: FudsRadius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: FudsColors.foreground, marginLeft: 8 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
  },
  chipActive: { backgroundColor: FudsColors.primary, borderColor: FudsColors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: FudsColors.foreground },
  chipTextActive: { color: FudsColors.primaryForeground },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    color: FudsColors.destructive,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: { paddingHorizontal: Spacing.three, paddingBottom: 40 },
  columnWrap: { justifyContent: 'space-between', marginBottom: 12 },
  productCard: {
    width: '48%',
    backgroundColor: FudsColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: FudsColors.border,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  productImage: { width: '100%', aspectRatio: 1.05, backgroundColor: FudsColors.muted },
  productBody: { padding: 10 },
  productName: { fontSize: 14, fontWeight: '800', color: FudsColors.foreground },
  productVendor: { marginTop: 4, fontSize: 11, color: FudsColors.mutedForeground, fontWeight: '600' },
  productMeta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: { fontSize: 14, fontWeight: '900', color: FudsColors.primary },
  shopPill: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '900', color: FudsColors.foreground },
  emptyText: { marginTop: 4, fontSize: 12, color: FudsColors.mutedForeground, fontWeight: '600' },
});
