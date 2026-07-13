/**
 * Cart Screen — matches FUDS mockup tokens.
 * Checkout bar sits above the NativeTabs bar (BottomTabInset).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import { cartApi, ordersApi, type CartItemRead, type CartRead, type OrderRead } from '@/lib/api';
import { FudsButton } from '@/components/ui/fuds-button';
import {
  BottomTabInset,
  FudsColors,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';

const EMPTY_CART: CartRead = { user_id: 0, items: [], total: 0, item_count: 0 };

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  // NativeTabs content can draw under the tab bar — keep footer clear of it
  const tabClearance = BottomTabInset + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0);

  const [cart, setCart] = useState<CartRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderRead | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setError(null);
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cart');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadCart();
      setLoading(false);
    })();
  }, [loadCart]);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [loadCart])
  );

  const changeQuantity = async (item: CartItemRead, delta: number) => {
    const nextQty = item.quantity + delta;
    setUpdatingId(item.product_id);
    try {
      if (nextQty <= 0) {
        const updated = await cartApi.removeItem(item.product_id);
        setCart(updated);
      } else {
        const updated = await cartApi.updateItem({
          product_id: item.product_id,
          quantity: nextQty,
        });
        setCart(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    try {
      await cartApi.clearCart();
      setCart((prev) => ({ ...EMPTY_CART, user_id: prev?.user_id ?? 0 }));
      setLastOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear cart');
    }
  };

  const handleCheckout = async () => {
    if (!cart?.items.length) return;

    setCheckingOut(true);
    setError(null);
    try {
      const order = await ordersApi.checkout({});
      setLastOrder(order);
      setCart((prev) => ({
        ...EMPTY_CART,
        user_id: prev?.user_id ?? order.user_id,
      }));

      const itemLines = order.items
        .map((i) => `· ${i.product_name ?? `Product #${i.product_id}`} × ${i.quantity}`)
        .join('\n');

      Alert.alert(
        'Order placed!',
        `Order #${order.id}\nTotal: ₦${Number(order.total_price).toLocaleString()}\nStatus: ${order.status} · Payment: ${order.payment_status}${itemLines ? `\n\n${itemLines}` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={FudsColors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;
  const footerHeight = isEmpty ? 0 : 130;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your Cart</Text>
          {!isEmpty && (
            <Text style={styles.headerSub}>
              {cart?.item_count ?? items.length} item
              {(cart?.item_count ?? items.length) === 1 ? '' : 's'} · multi-vendor ready
            </Text>
          )}
        </View>
        {!isEmpty && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={FudsColors.destructive} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={FudsColors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {lastOrder && isEmpty ? (
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={18} color={FudsColors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>Order #{lastOrder.id} placed</Text>
            <Text style={styles.successSub}>
              ₦{Number(lastOrder.total_price).toLocaleString()} · {lastOrder.status}
            </Text>
          </View>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.product_id)}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: footerHeight + tabClearance + Spacing.three,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Ionicons name="restaurant-outline" size={22} color={FudsColors.mutedForeground} />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemUnit}>₦{Number(item.price).toLocaleString()} each</Text>
              <Text style={styles.itemSubtotal}>
                ₦{Number(item.subtotal).toLocaleString()}
              </Text>
            </View>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => changeQuantity(item, -1)}
                disabled={updatingId === item.product_id}
              >
                <Ionicons
                  name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                  size={15}
                  color={item.quantity === 1 ? FudsColors.destructive : FudsColors.primary}
                />
              </TouchableOpacity>
              {updatingId === item.product_id ? (
                <ActivityIndicator size="small" color={FudsColors.primary} style={{ width: 28 }} />
              ) : (
                <Text style={styles.qtyText}>{item.quantity}</Text>
              )}
              <TouchableOpacity
                style={[styles.qtyButton, styles.qtyButtonPlus]}
                onPress={() => changeQuantity(item, 1)}
                disabled={updatingId === item.product_id}
              >
                <Ionicons name="add" size={16} color={FudsColors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cart-outline" size={40} color={FudsColors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {lastOrder ? 'Order sent — cart is empty' : 'Your cart is empty'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {lastOrder
                ? 'Browse more vendors from Home to place another order.'
                : 'Browse vendors from Home to add meals and groceries.'}
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                router.push('/(app)/(tabs)/' as any);
              }}
            >
              <Text style={styles.browseBtnText}>Browse vendors</Text>
              <Ionicons name="arrow-forward" size={14} color={FudsColors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Sticky checkout bar — lifted above NativeTabs */}
      {!isEmpty && (
        <View style={[styles.footer, { paddingBottom: tabClearance }]}>
          <View style={styles.footerInner}>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalHint}>
                  {cart?.item_count ?? items.length} item
                  {(cart?.item_count ?? items.length) === 1 ? '' : 's'}
                </Text>
              </View>
              <Text style={styles.totalValue}>₦{Number(cart?.total ?? 0).toLocaleString()}</Text>
            </View>
            <FudsButton label="Checkout" loading={checkingOut} onPress={handleCheckout} />
          </View>
        </View>
      )}
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: FudsColors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: FudsColors.foreground },
  headerSub: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 2, fontWeight: '600' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  clearText: { fontSize: 13, fontWeight: '700', color: FudsColors.destructive },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    padding: Spacing.two,
    backgroundColor: '#FEF2F2',
    borderRadius: FudsRadius.md,
  },
  errorText: { flex: 1, color: FudsColors.destructive, fontSize: 12, fontWeight: '600' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
    backgroundColor: FudsColors.openBg,
    borderRadius: FudsRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.2)',
  },
  successIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: FudsColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 14, fontWeight: '800', color: FudsColors.openText },
  successSub: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 2 },
  listContent: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.lg,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    marginBottom: Spacing.two + 2,
    ...FudsShadow.sm,
  },
  itemImage: { width: 64, height: 64, borderRadius: FudsRadius.md },
  itemImagePlaceholder: {
    backgroundColor: FudsColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontWeight: '800', fontSize: 14, color: FudsColors.foreground, lineHeight: 18 },
  itemUnit: { fontSize: 11, color: FudsColors.mutedForeground, marginTop: 3, fontWeight: '600' },
  itemSubtotal: { fontSize: 14, color: FudsColors.primary, fontWeight: '800', marginTop: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonPlus: { backgroundColor: FudsColors.primary },
  qtyText: {
    minWidth: 22,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
    color: FudsColors.foreground,
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    marginTop: 72,
    paddingHorizontal: Spacing.four,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontWeight: '800', fontSize: 17, color: FudsColors.foreground, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 13,
    color: FudsColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: FudsColors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: FudsRadius.md,
  },
  browseBtnText: { fontWeight: '800', fontSize: 13, color: FudsColors.primary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: FudsColors.background,
    borderTopWidth: 1,
    borderTopColor: FudsColors.border,
    ...FudsShadow.md,
  },
  footerInner: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: FudsColors.mutedForeground, fontWeight: '700' },
  totalHint: { fontSize: 11, color: FudsColors.mutedForeground, marginTop: 1 },
  totalValue: { fontSize: 22, fontWeight: '800', color: FudsColors.foreground },
});
