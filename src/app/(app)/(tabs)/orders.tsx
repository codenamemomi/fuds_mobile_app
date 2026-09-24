/**
 * Orders tab — Cart (checkout) + My Orders history.
 * Replaces the old Cart-only tab.
 */

import { FudsButton } from '@/components/ui/fuds-button';
import {
  BottomTabInset,
  FudsColors,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';
import {
  cartApi,
  marketplaceApi,
  ordersApi,
  type CartItemRead,
  type CartRead,
  type GrocerySubscriptionRead,
  type OrderRead,
} from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useEffect, useState } from 'react';
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

type Segment = 'cart' | 'subscriptions' | 'history';

const EMPTY_CART: CartRead = { user_id: 0, items: [], total: 0, item_count: 0 };

function statusColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'confirmed' || s === 'completed' || s === 'success') {
    return { bg: FudsColors.openBg, text: FudsColors.openText };
  }
  if (s === 'pending') {
    return { bg: '#FEF3C7', text: '#B45309' };
  }
  if (s === 'cancelled' || s === 'failed') {
    return { bg: '#FEE2E2', text: FudsColors.destructive };
  }
  return { bg: FudsColors.muted, text: FudsColors.mutedForeground };
}

function readTabParam(tab: string | string[] | undefined): Segment | null {
  const value = Array.isArray(tab) ? tab[0] : tab;
  if (value === 'history' || value === 'orders') return 'history';
  if (value === 'subscriptions') return 'subscriptions';
  if (value === 'cart') return 'cart';
  return null;
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  // Footer sits above the solid tab bar (Tabs no longer overlays content)
  const tabClearance = BottomTabInset + Math.max(insets.bottom, 8);
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const requestedTab = readTabParam(params.tab);

  const [segment, setSegment] = useState<Segment>(requestedTab ?? 'cart');
  const [cart, setCart] = useState<CartRead | null>(null);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [pendingOrders, setPendingOrders] = useState<OrderRead[]>([]);
  const [subscriptions, setSubscriptions] = useState<GrocerySubscriptionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionCycles, setSubscriptionCycles] = useState(1);

  const loadCart = useCallback(async () => {
    try {
      setError(null);
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cart');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      setOrdersLoading(true);
      const [paid, pending] = await Promise.all([
        ordersApi.listOrders('paid'),
        ordersApi.listOrders('pending'),
      ]);
      setOrders(paid);
      setPendingOrders(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    try {
      setError(null);
      setSubscriptionsLoading(true);
      setSubscriptions(await marketplaceApi.listShoppingLists());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load grocery subscriptions');
    } finally {
      setSubscriptionsLoading(false);
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
      const next = requestedTab;
      if (next) {
        setSegment(next);
        // Consume the one-shot param so later tab visits don't stick on history.
        router.setParams({ tab: '' });
      }
      loadCart();
      if (next === 'history' || segment === 'history') {
        loadOrders();
      }
      if (next === 'subscriptions' || segment === 'subscriptions') loadSubscriptions();
    }, [loadCart, loadOrders, loadSubscriptions, requestedTab, segment])
  );

  useEffect(() => {
    if (segment === 'history') {
      loadOrders();
    }
  }, [segment, loadOrders]);

  useEffect(() => {
    if (segment === 'subscriptions') loadSubscriptions();
  }, [segment, loadSubscriptions]);

  const changeQuantity = async (item: CartItemRead, delta: number) => {
    const nextQty = item.quantity + delta;
    const itemId = item.product_id ?? item.marketplace_product_id ?? 0;
    setUpdatingId(itemId);
    try {
      if (nextQty <= 0) {
        setCart(item.marketplace_product_id != null
          ? await cartApi.removeMarketplaceItem(item.marketplace_product_id)
          : await cartApi.removeItem(item.product_id!));
      } else {
        setCart(
          await cartApi.updateItem({
            ...(item.marketplace_product_id != null
              ? { marketplace_product_id: item.marketplace_product_id }
              : { product_id: item.product_id! }),
            quantity: nextQty,
          })
        );
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear cart');
    }
  };

  const openPayment = (orderId: number, total?: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({
      pathname: '/(app)/payment/[orderId]' as any,
      params: {
        orderId: String(orderId),
        ...(total != null ? { total: String(total) } : {}),
      },
    });
  };

  const handleCheckout = async () => {
    if (!cart?.items.length) return;
    setCheckingOut(true);
    setError(null);
    try {
      const order = await ordersApi.checkout({});
      setCart((prev) => ({
        ...EMPTY_CART,
        user_id: prev?.user_id ?? order.user_id,
      }));
      // Order is pending payment — go straight to Paystack card / Titan transfer
      openPayment(order.id, Number(order.total_price));
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
  const footerHeight = segment === 'cart' && !isEmpty ? 140 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerSub}>Cart & past deliveries</Text>
      </View>

      {/* Segment control */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentTrack}>
          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'cart' && styles.segmentBtnActive]}
            onPress={() => setSegment('cart')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="cart"
              size={16}
              color={segment === 'cart' ? FudsColors.primaryForeground : FudsColors.mutedForeground}
            />
            <Text
              style={[styles.segmentText, segment === 'cart' && styles.segmentTextActive]}
            >
              Cart
              {(cart?.item_count ?? 0) > 0 ? ` (${cart?.item_count})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'subscriptions' && styles.segmentBtnActive]}
            onPress={() => setSegment('subscriptions')}
            activeOpacity={0.85}
          >
            <Ionicons name="repeat" size={15} color={segment === 'subscriptions' ? FudsColors.primaryForeground : FudsColors.mutedForeground} />
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.segmentText, segment === 'subscriptions' && styles.segmentTextActive]}
            >
              Grocery Subscriptions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'history' && styles.segmentBtnActive]}
            onPress={() => setSegment('history')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="receipt"
              size={16}
              color={
                segment === 'history' ? FudsColors.primaryForeground : FudsColors.mutedForeground
              }
            />
            <Text
              style={[styles.segmentText, segment === 'history' && styles.segmentTextActive]}
            >
              My Orders
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={FudsColors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {segment === 'cart' ? (
        <>
          {!isEmpty && (
            <View style={styles.cartActions}>
              <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
                <Ionicons name="trash-outline" size={15} color={FudsColors.destructive} />
                <Text style={styles.clearText}>Clear cart</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.product_id ?? `marketplace-${item.marketplace_product_id}`)}
            contentContainerStyle={{
              paddingHorizontal: Spacing.three,
              paddingBottom: footerHeight + tabClearance + Spacing.three,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemImageShell}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <Ionicons
                        name="restaurant-outline"
                        size={22}
                        color={FudsColors.mutedForeground}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemUnit}>
                    ₦{Number(item.price).toLocaleString()} each
                  </Text>
                  <Text style={styles.itemSubtotal}>
                    ₦{Number(item.subtotal).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => changeQuantity(item, -1)}
                    disabled={updatingId === (item.product_id ?? item.marketplace_product_id)}
                  >
                    <Ionicons
                      name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                      size={15}
                      color={
                        item.quantity === 1 ? FudsColors.destructive : FudsColors.primary
                      }
                    />
                  </TouchableOpacity>
                  {updatingId === item.product_id ? (
                    <ActivityIndicator
                      size="small"
                      color={FudsColors.primary}
                      style={{ width: 28 }}
                    />
                  ) : (
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.qtyButton, styles.qtyButtonPlus]}
                    onPress={() => changeQuantity(item, 1)}
                    disabled={updatingId === (item.product_id ?? item.marketplace_product_id)}
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
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Browse vendors from Home, then check out here.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  activeOpacity={0.85}
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
          {pendingOrders
            .filter((order) => !(order.items ?? []).some((entry) => entry.marketplace_product_id))
            .map((order) => (
              <View key={order.id} style={[styles.orderCard, { marginHorizontal: Spacing.three, marginBottom: Spacing.two }]}>
                <Text style={styles.orderId}>Unpaid order #{order.id}</Text>
                <Text style={styles.orderDate}>Still in checkout — pay or it stays here, not in My Orders.</Text>
                <Text style={styles.orderTotal}>₦{Number(order.total_price).toLocaleString()}</Text>
                <TouchableOpacity
                  style={styles.payNowBtn}
                  onPress={() => openPayment(order.id, Number(order.total_price))}
                >
                  <Ionicons name="card-outline" size={16} color={FudsColors.primaryForeground} />
                  <Text style={styles.payNowText}>Pay now</Text>
                </TouchableOpacity>
              </View>
            ))}

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
                  <Text style={styles.totalValue}>
                    ₦{Number(cart?.total ?? 0).toLocaleString()}
                  </Text>
                </View>
                <FudsButton
                  label="Place order & pay"
                  loading={checkingOut}
                  onPress={handleCheckout}
                />
              </View>
            </View>
          )}
        </>
      ) : segment === 'subscriptions' ? (
        <FlatList
          data={subscriptions.slice(0, 1)}
          keyExtractor={(item) => String(item.id)}
          style={styles.subscriptionList}
          contentContainerStyle={styles.subscriptionListContent}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.subscriptionCard}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderId}>Your grocery subscription</Text>
                  <Text style={styles.orderDate}>{item.item_count} items · {item.frequency}</Text>
                </View>
                  <View style={[styles.badge, { backgroundColor: item.payment_status === 'paid' ? FudsColors.openBg : '#FEF3C7' }]}><Text style={[styles.badgeText, { color: item.payment_status === 'paid' ? FudsColors.openText : '#B45309' }]}>{item.payment_status === 'paid' ? 'paid' : 'unpaid · editable'}</Text></View>
              </View>
              <Text style={styles.subscriptionItems}>{item.items.slice(0, 3).map((entry) => entry.name).join(', ')}</Text>
              <View style={styles.cyclePicker}>
                <View style={styles.cycleCopy}>
                  <Text style={styles.cycleTitle}>Pay for cycles</Text>
                  <Text style={styles.cycleHint}>Choose 1 to 5 {item.frequency} deliveries</Text>
                </View>
                <TouchableOpacity style={styles.cycleButton} onPress={() => setSubscriptionCycles((count) => Math.max(1, count - 1))}>
                  <Ionicons name="remove" size={16} color={FudsColors.foreground} />
                </TouchableOpacity>
                <Text style={styles.cycleValue}>{subscriptionCycles}</Text>
                <TouchableOpacity style={styles.cycleButtonActive} onPress={() => setSubscriptionCycles((count) => Math.min(5, count + 1))}>
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              {item.added_items.length > 0 ? (
                <Text style={styles.subscriptionChangeAdded}>
                  Added: {item.added_items.map((entry) => `${entry.name} ×${entry.quantity}`).join(', ')} (+₦{item.added_items.reduce((sum, entry) => sum + entry.amount, 0).toLocaleString()})
                </Text>
              ) : null}
              {item.removed_items.length > 0 ? (
                <Text style={styles.subscriptionChangeRemoved}>
                  Removed: {item.removed_items.map((entry) => `${entry.name} ×${entry.quantity}`).join(', ')} (-₦{item.removed_items.reduce((sum, entry) => sum + entry.amount, 0).toLocaleString()})
                </Text>
              ) : null}
              {item.change_total !== 0 ? (
                <Text style={styles.subscriptionChangeTotal}>
                  List change: {item.change_total > 0 ? '+' : '-'}₦{Math.abs(item.change_total).toLocaleString()}
                </Text>
              ) : null}
              <View style={styles.subscriptionActions}>
                <TouchableOpacity style={styles.subscriptionCancel} onPress={async () => { await marketplaceApi.updateShoppingList(item.id, { status: item.status === 'active' ? 'paused' : 'active' }); loadSubscriptions(); }}>
                  <Text style={styles.subscriptionCancelText}>{item.status === 'active' ? 'Deactivate sub' : 'Activate sub'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subscriptionCheckout, item.payment_status === 'paid' && styles.subscriptionCheckoutDisabled]}
                  disabled={item.payment_status === 'paid'}
                  onPress={async () => {
                    try {
                      const order = await marketplaceApi.checkoutShoppingList(item.id, subscriptionCycles);
                      openPayment(order.id, Number(order.total_price));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not start grocery payment');
                    }
                  }}
                >
                  <Text style={styles.subscriptionCheckoutText}>
                    {item.payment_status === 'paid'
                      ? 'Paid · Await delivery'
                      : `Pay ₦${Number(item.total * subscriptionCycles).toLocaleString()}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={subscriptionsLoading ? <ActivityIndicator color={FudsColors.primary} style={{ marginTop: 48 }} /> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No grocery subscriptions</Text><Text style={styles.emptySubtitle}>Create one from the Marketplace.</Text></View>}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: Spacing.three,
            paddingBottom: tabClearance + Spacing.four,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshing={ordersLoading}
          onRefresh={loadOrders}
          renderItem={({ item }) => {
            const st = statusColor(item.status);
            const pay = statusColor(item.payment_status);
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderCardAccent} />
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderId}>Order #{item.id}</Text>
                    <Text style={styles.orderDate}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : '—'}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.text }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  {(item.items ?? []).slice(0, 4).map((oi) => (
                    <Text key={oi.id} style={styles.orderItemLine} numberOfLines={1}>
                      · {oi.product_name ?? `Product #${oi.product_id}`} × {oi.quantity}
                    </Text>
                  ))}
                  {(item.items?.length ?? 0) > 4 && (
                    <Text style={styles.orderItemMore}>
                      +{(item.items?.length ?? 0) - 4} more
                    </Text>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <View style={[styles.badge, { backgroundColor: pay.bg }]}>
                    <Text style={[styles.badgeText, { color: pay.text }]}>
                      pay: {item.payment_status}
                    </Text>
                  </View>
                  <Text style={styles.orderTotal}>
                    ₦{Number(item.total_price).toLocaleString()}
                  </Text>
                </View>


              </View>
            );
          }}
          ListEmptyComponent={
            ordersLoading ? (
              <ActivityIndicator color={FudsColors.primary} style={{ marginTop: 48 }} />
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="receipt-outline" size={40} color="#B45309" />
                </View>
                <Text style={styles.emptyTitle}>No orders yet</Text>
                <Text style={styles.emptySubtitle}>
                  When you place an order from Cart, it will show up here.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  activeOpacity={0.85}
                  onPress={() => setSegment('cart')}
                >
                  <Text style={styles.browseBtnText}>Go to cart</Text>
                  <Ionicons name="arrow-forward" size={14} color={FudsColors.primary} />
                </TouchableOpacity>
              </View>
            )
          }
        />
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: FudsColors.foreground },
  headerSub: {
    fontSize: 13,
    color: FudsColors.mutedForeground,
    marginTop: 2,
    fontWeight: '600',
  },
  segmentWrap: { paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: FudsColors.border,
    ...FudsShadow.sm,
  },
  segmentBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 9,
    borderRadius: FudsRadius.full,
  },
  segmentBtnActive: {
    backgroundColor: FudsColors.primary,
  },
  segmentText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    color: FudsColors.mutedForeground,
  },
  segmentTextActive: { color: FudsColors.primaryForeground },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    backgroundColor: '#FEF2F2',
    borderRadius: FudsRadius.md,
  },
  errorText: { flex: 1, color: FudsColors.destructive, fontSize: 12, fontWeight: '600' },
  cartActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    marginBottom: 6,
  },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { fontSize: 13, fontWeight: '700', color: FudsColors.destructive },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: FudsColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    marginBottom: Spacing.two + 2,
    ...FudsShadow.sm,
  },
  itemImageShell: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FudsColors.border,
  },
  itemImage: { width: 64, height: 64 },
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
    borderRadius: 12,
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
    marginTop: 56,
    paddingHorizontal: Spacing.four,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    transform: [{ rotate: '-6deg' }],
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
    borderRadius: FudsRadius.full,
  },
  browseBtnText: { fontWeight: '800', fontSize: 13, color: FudsColors.primary },
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
  totalValue: { fontSize: 22, fontWeight: '900', color: FudsColors.foreground },

  orderCard: {
    backgroundColor: FudsColors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  orderCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: FudsColors.primary,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  subscriptionCard: {
    backgroundColor: FudsColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    width: '100%',
    ...FudsShadow.sm,
  },
  subscriptionList: { flex: 1 },
  subscriptionListContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  subscriptionItems: {
    marginTop: Spacing.two,
    color: FudsColors.mutedForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  cyclePicker: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: FudsColors.background, borderWidth: 1, borderColor: FudsColors.border },
  cycleCopy: { flex: 1 },
  cycleTitle: { color: FudsColors.foreground, fontSize: 12, fontWeight: '900' },
  cycleHint: { color: FudsColors.mutedForeground, fontSize: 10, fontWeight: '600', marginTop: 2 },
  cycleButton: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: FudsColors.border, alignItems: 'center', justifyContent: 'center' },
  cycleButtonActive: { width: 28, height: 28, borderRadius: 8, backgroundColor: FudsColors.primary, alignItems: 'center', justifyContent: 'center' },
  cycleValue: { minWidth: 24, textAlign: 'center', color: FudsColors.foreground, fontSize: 14, fontWeight: '900' },
  subscriptionChangeAdded: { marginTop: 6, color: FudsColors.openText, fontSize: 11, fontWeight: '700' },
  subscriptionChangeRemoved: { marginTop: 4, color: FudsColors.destructive, fontSize: 11, fontWeight: '700' },
  subscriptionChangeTotal: { marginTop: 6, color: FudsColors.foreground, fontSize: 12, fontWeight: '900' },
  subscriptionActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  subscriptionCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: FudsColors.border,
    borderRadius: FudsRadius.md,
    paddingVertical: 10,
  },
  subscriptionCancelText: { color: FudsColors.destructive, fontWeight: '800', fontSize: 12 },
  subscriptionCheckout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FudsRadius.md,
    paddingVertical: 10,
    backgroundColor: FudsColors.primary,
  },
  subscriptionCheckoutText: { color: FudsColors.primaryForeground, fontWeight: '800', fontSize: 12 },
  subscriptionCheckoutDisabled: { backgroundColor: FudsColors.muted },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginLeft: 6,
  },
  orderId: { fontSize: 15, fontWeight: '900', color: FudsColors.foreground },
  orderDate: { fontSize: 11, color: FudsColors.mutedForeground, marginTop: 2, fontWeight: '600' },
  badge: {
    borderRadius: FudsRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  orderItems: { marginTop: Spacing.two, marginLeft: 6, gap: 2 },
  orderItemLine: { fontSize: 12, color: FudsColors.mutedForeground, fontWeight: '600' },
  orderItemMore: { fontSize: 11, color: FudsColors.primary, fontWeight: '700', marginTop: 2 },
  orderFooter: {
    marginTop: Spacing.three,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTotal: { fontSize: 18, fontWeight: '900', color: FudsColors.foreground },
  payNowBtn: {
    marginTop: Spacing.two,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: FudsColors.primary,
    paddingVertical: 12,
    borderRadius: FudsRadius.md,
  },
  payNowText: {
    fontSize: 14,
    fontWeight: '800',
    color: FudsColors.primaryForeground,
  },
});
