/**
 * Orders tab — Cart (vendor-grouped checkout) + Ongoing orders + Order History.
 */

import {
  BottomTabInset,
  FudsColors,
  FudsRadius,
  FudsShadow,
  Spacing,
} from '@/constants/theme';
import { useCart } from '@/context/cart';
import { QtyButton } from '@/components/ui/qty-button';
import {
  browseApi,
  marketplaceApi,
  ordersApi,
  type CartItemRead,
  type GrocerySubscriptionRead,
  type OrderRead,
} from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export type Segment = 'cart' | 'ongoing' | 'history';

const TERMINAL_ORDER_STATUSES = new Set([
  'delivered',
  'completed',
  'cancelled',
  'canceled',
  'failed',
  'rejected',
  'refunded',
]);

export interface VendorCartGroup {
  key: string;
  vendor_id?: number | null;
  is_marketplace: boolean;
  vendor_name: string;
  items: CartItemRead[];
  subtotal: number;
  item_count: number;
}

export function groupCartByVendor(
  items: CartItemRead[],
  vendorNames?: Record<number, string>
): VendorCartGroup[] {
  const map = new Map<string, VendorCartGroup>();

  for (const item of items) {
    const isMarketplace = item.marketplace_product_id != null || item.vendor_id == null;
    const key = isMarketplace ? 'marketplace' : `vendor-${item.vendor_id}`;
    const fallbackVendorName =
      (item.vendor_id ? vendorNames?.[item.vendor_id] : null) ||
      (isMarketplace ? 'FUDS Market' : 'Vendor');
    const name = item.vendor_name || fallbackVendorName;

    if (!map.has(key)) {
      map.set(key, {
        key,
        vendor_id: isMarketplace ? null : item.vendor_id,
        is_marketplace: isMarketplace,
        vendor_name: name,
        items: [],
        subtotal: 0,
        item_count: 0,
      });
    }

    const group = map.get(key)!;
    if (group.vendor_name === 'Vendor' && name !== 'Vendor') {
      group.vendor_name = name;
    }
    group.items.push(item);
    group.subtotal += Number(item.subtotal || item.price * item.quantity);
    group.item_count += item.quantity;
  }

  return Array.from(map.values());
}

export function isOngoingOrder(order: OrderRead): boolean {
  const st = (order.status ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const paySt = (order.payment_status ?? '').toLowerCase().trim();

  // If order status is explicitly terminal, it belongs to history
  if (TERMINAL_ORDER_STATUSES.has(st)) {
    return false;
  }

  // If payment failed or was cancelled, and order isn't active, it belongs to history
  if (paySt === 'cancelled' || paySt === 'canceled' || paySt === 'failed') {
    return false;
  }

  // Otherwise, it is an active/ongoing order
  return true;
}

export function isHistoryOrder(order: OrderRead): boolean {
  return !isOngoingOrder(order);
}

function statusColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (
    s === 'paid' ||
    s === 'confirmed' ||
    s === 'completed' ||
    s === 'delivered' ||
    s === 'success'
  ) {
    return { bg: FudsColors.openBg, text: FudsColors.openText };
  }
  if (s === 'preparing' || s === 'in_kitchen' || s === 'processing') {
    return { bg: '#E0F2FE', text: '#0369A1' };
  }
  if (
    s === 'out_for_delivery' ||
    s === 'on_the_way' ||
    s === 'in_transit' ||
    s === 'dispatched'
  ) {
    return { bg: '#EDE9FE', text: '#6D28D9' };
  }
  if (s === 'pending' || s === 'placed' || s === 'order_placed') {
    return { bg: '#FEF3C7', text: '#B45309' };
  }
  if (
    s === 'cancelled' ||
    s === 'canceled' ||
    s === 'failed' ||
    s === 'rejected'
  ) {
    return { bg: '#FEE2E2', text: FudsColors.destructive };
  }
  return { bg: FudsColors.muted, text: FudsColors.mutedForeground };
}

function formatStatus(status: string): string {
  if (!status) return '—';
  const clean = status.trim().replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function readTabParam(tab: string | string[] | undefined): Segment | null {
  const value = Array.isArray(tab) ? tab[0] : tab;
  if (value === 'history') return 'history';
  if (value === 'ongoing' || value === 'subscriptions' || value === 'orders') return 'ongoing';
  if (value === 'cart') return 'cart';
  return null;
}

function formatDeliveryDate(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

function OrderCard({
  order,
  isOngoing,
  onPay,
  onEditMarketList,
  marketListSubscription,
}: {
  order: OrderRead;
  isOngoing: boolean;
  onPay: () => void;
  onEditMarketList?: () => void;
  marketListSubscription?: GrocerySubscriptionRead | null;
}) {
  const st = statusColor(order.status);
  const pay = statusColor(order.payment_status);
  const isPaid = (order.payment_status ?? '').toLowerCase() === 'paid';
  const isUnpaid = (order.payment_status ?? '').toLowerCase() === 'pending';
  const isCancelled =
    order.status === 'cancelled' ||
    order.status === 'canceled' ||
    order.status === 'failed';

  const isMarketList =
    !!marketListSubscription ||
    (order.items &&
      order.items.length > 0 &&
      order.items.some((i) => i.marketplace_product_id != null));
  const freq = marketListSubscription?.frequency;
  const deliveryDateFormatted = formatDeliveryDate(order.delivery_time);

  return (
    <View style={styles.orderCard}>
      <View
        style={[
          styles.orderCardAccent,
          isCancelled ? { backgroundColor: FudsColors.destructive } : null,
          isMarketList ? { backgroundColor: FudsColors.primary } : null,
        ]}
      />
      <View style={styles.orderTop}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isMarketList && (
              <Ionicons name="basket" size={15} color={FudsColors.primary} />
            )}
            <Text style={styles.orderId} numberOfLines={1}>
              {isMarketList
                ? isPaid
                  ? `Paid Market Delivery #${order.id}`
                  : `Next Market Delivery #${order.id}`
                : `Order #${order.id}`}
            </Text>
          </View>
          <Text style={styles.orderDate}>
            {deliveryDateFormatted
              ? `${isPaid ? 'Delivery' : 'Next delivery'}: ${deliveryDateFormatted}`
              : order.created_at
              ? new Date(order.created_at).toLocaleString()
              : '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isMarketList && freq && !isPaid && (
            <View style={styles.orderFreqBadge}>
              <Text style={styles.orderFreqBadgeText}>
                {freq === 'bi-weekly' ? 'Bi-Weekly' : freq[0].toUpperCase() + freq.slice(1)}
              </Text>
            </View>
          )}
          {isMarketList && isPaid && (
            <View style={[styles.orderFreqBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.orderFreqBadgeText, { color: '#065F46' }]}>
                Paid Delivery
              </Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: isPaid ? FudsColors.openBg : st.bg }]}>
            <Text style={[styles.badgeText, { color: isPaid ? FudsColors.openText : st.text }]}>
              {isPaid ? 'Paid' : formatStatus(order.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderItems}>
        {(order.items ?? []).slice(0, 4).map((oi) => (
          <Text key={oi.id} style={styles.orderItemLine} numberOfLines={1}>
            · {oi.product_name ?? `Product #${oi.product_id}`} × {oi.quantity}
          </Text>
        ))}
        {(order.items?.length ?? 0) > 4 && (
          <Text style={styles.orderItemMore}>
            +{(order.items?.length ?? 0) - 4} more
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={[styles.badge, { backgroundColor: pay.bg }]}>
          <Text style={[styles.badgeText, { color: pay.text }]}>
            pay: {formatStatus(order.payment_status)}
          </Text>
        </View>
        <Text style={styles.orderTotal}>
          ₦{Number(order.total_price).toLocaleString()}
        </Text>
      </View>

      {isOngoing && isUnpaid && (
        <View style={isMarketList ? styles.orderActionsRow : undefined}>
          {isMarketList && onEditMarketList && (
            <TouchableOpacity
              style={styles.editListBtn}
              onPress={onEditMarketList}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color={FudsColors.primary} />
              <Text style={styles.editListText}>Edit List</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.payNowBtn, isMarketList && { flex: 1, marginTop: 0, marginLeft: 0 }]}
            onPress={onPay}
            activeOpacity={0.85}
          >
            <Ionicons name="card-outline" size={16} color={FudsColors.primaryForeground} />
            <Text style={styles.payNowText}>
              {isMarketList ? 'Review & Pay' : 'Pay now'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function VendorCartCard({
  group,
  onQuantityChange,
  onPayVendor,
  isPayingVendor,
  disabled,
}: {
  group: VendorCartGroup;
  onQuantityChange: (item: CartItemRead, delta: number) => void;
  onPayVendor: (group: VendorCartGroup) => void;
  isPayingVendor: boolean;
  disabled: boolean;
}) {
  return (
    <View style={styles.vendorCard}>
      {/* Vendor Header */}
      <View style={styles.vendorHeader}>
        <View style={styles.vendorHeaderLeft}>
          <View style={styles.vendorIconWrap}>
            <Ionicons
              name={group.is_marketplace ? 'basket' : 'storefront'}
              size={16}
              color={FudsColors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorName} numberOfLines={1}>
              {group.vendor_name}
            </Text>
            <Text style={styles.vendorItemCount}>
              {group.items.length} product{group.items.length === 1 ? '' : 's'} · {group.item_count} item{group.item_count === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
        <View style={styles.vendorHeaderRight}>
          <Text style={styles.vendorHeaderSubtotal}>
            ₦{Math.round(group.subtotal).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Items list */}
      <View style={styles.vendorItemsList}>
        {group.items.map((item, index) => {
          const isLast = index === group.items.length - 1;

          return (
            <View
              key={String(item.product_id ?? `marketplace-${item.marketplace_product_id}`)}
              style={[styles.productRow, isLast && { borderBottomWidth: 0 }]}
            >
              <View style={styles.productImageShell}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.productImagePlaceholder]}>
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color={FudsColors.mutedForeground}
                    />
                  </View>
                )}
              </View>

              <View style={styles.productDetails}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productUnitPrice}>
                  ₦{Number(item.price).toLocaleString()} each
                </Text>
                <Text style={styles.productSubtotal}>
                  ₦{Number(item.subtotal).toLocaleString()}
                </Text>
              </View>

              <View style={styles.qtyControl}>
                <QtyButton
                  variant="remove"
                  iconName={item.quantity === 1 ? 'trash-outline' : undefined}
                  size={28}
                  radius={9}
                  backgroundColor={
                    item.quantity === 1 ? '#FEE2E2' : 'rgba(29, 158, 117, 0.12)'
                  }
                  tintColor={
                    item.quantity === 1 ? FudsColors.destructive : FudsColors.primary
                  }
                  onPress={() => onQuantityChange(item, -1)}
                  disabled={disabled}
                />

                <Text style={styles.qtyText}>{item.quantity}</Text>

                <QtyButton
                  variant="add"
                  size={28}
                  radius={9}
                  backgroundColor={FudsColors.primary}
                  tintColor="#fff"
                  onPress={() => onQuantityChange(item, 1)}
                  disabled={disabled}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Vendor card footer with "Pay for vendor" */}
      <View style={styles.vendorFooter}>
        <View style={styles.vendorSubtotalCol}>
          <Text style={styles.vendorFooterLabel}>Vendor subtotal</Text>
          <Text style={styles.vendorFooterAmount}>
            ₦{Math.round(group.subtotal).toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.payVendorBtn, disabled && styles.payVendorBtnDisabled]}
          onPress={() => onPayVendor(group)}
          disabled={disabled}
          activeOpacity={0.85}
        >
          {isPayingVendor ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="card-outline" size={15} color="#fff" />
              <Text style={styles.payVendorBtnText}>
                {group.is_marketplace ? 'Pay for market items' : 'Pay for this vendor'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  // Footer sits above the solid tab bar
  const tabClearance = BottomTabInset + Math.max(insets.bottom, 8);
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const requestedTab = readTabParam(params.tab);

  const [segment, setSegment] = useState<Segment>(requestedTab ?? 'cart');
  const { cart, refreshCart, clearCart, updateItem } = useCart();
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [subscriptions, setSubscriptions] = useState<GrocerySubscriptionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [vendorCheckingOutKey, setVendorCheckingOutKey] = useState<string | null>(null);
  const [vendorNames, setVendorNames] = useState<Record<number, string>>({});

  const loadCart = useCallback(async () => {
    try {
      setError(null);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cart');
    }
  }, [refreshCart]);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      setOrdersLoading(true);
      const [all, subs] = await Promise.all([
        ordersApi.listOrders(),
        marketplaceApi.listShoppingLists().catch(() => [] as GrocerySubscriptionRead[]),
      ]);
      setOrders(all);
      setSubscriptions(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const subscriptionByOrderId = useMemo(() => {
    const map = new Map<number, GrocerySubscriptionRead>();
    for (const sub of subscriptions) {
      if (sub.order_id) {
        map.set(sub.order_id, sub);
      }
    }
    return map;
  }, [subscriptions]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadCart(), loadOrders()]);
      setLoading(false);
    })();
  }, [loadCart, loadOrders]);

  useFocusEffect(
    useCallback(() => {
      const next = requestedTab;
      if (next) {
        setSegment(next);
        router.setParams({ tab: '' });
      }
      loadCart();
      loadOrders();
    }, [loadCart, loadOrders, requestedTab])
  );

  const handleSegmentChange = useCallback(
    (nextSegment: Segment) => {
      setSegment(nextSegment);
      if (nextSegment === 'ongoing' || nextSegment === 'history') {
        loadOrders();
      }
    },
    [loadOrders]
  );

  const changeQuantity = (item: CartItemRead, delta: number) => {
    const nextQty = item.quantity + delta;
    updateItem(item, nextQty).catch((err) => {
      setError(err instanceof Error ? err.message : 'Could not update item');
    });
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from all stores in your cart? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cart',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not clear cart');
            }
          },
        },
      ]
    );
  };

  const openPayment = (orderId: number, total?: number) => {
     
    router.push({
      pathname: '/(app)/payment/[orderId]' as any,
      params: {
        orderId: String(orderId),
        ...(total != null ? { total: String(total) } : {}),
      },
    });
  };

  // Individual vendor checkout
  const handleVendorCheckout = async (group: VendorCartGroup) => {
    setVendorCheckingOutKey(group.key);
    setError(null);
    try {
      const order = await ordersApi.checkout({
        vendor_id: group.is_marketplace ? undefined : (group.vendor_id ?? undefined),
        is_marketplace: group.is_marketplace,
      });
      // Refresh cart to show remaining stores/products
      await refreshCart();
      // Navigate to payment for this vendor order
      openPayment(order.id, Number(order.total_price));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not checkout this store');
    } finally {
      setVendorCheckingOutKey(null);
    }
  };

  // Global "Place & Pay" checkout
  const handleCheckout = async () => {
    if (!cart?.items.length) return;
    setCheckingOut(true);
    setError(null);
    try {
      const order = await ordersApi.checkout({});
      await clearCart();
      openPayment(order.id, Number(order.total_price));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const items = useMemo(() => cart?.items ?? [], [cart?.items]);
  const isEmpty = items.length === 0;

  // Pre-fetch any vendor names that might be missing from items
  useEffect(() => {
    const missingVendorIds = items
      .filter((i) => !i.vendor_name && i.vendor_id != null && !vendorNames[i.vendor_id])
      .map((i) => i.vendor_id as number);

    if (missingVendorIds.length === 0) return;

    let mounted = true;
    (async () => {
      try {
        const uniqueIds = Array.from(new Set(missingVendorIds));
        const entries = await Promise.all(
          uniqueIds.map(async (vid) => {
            try {
              const v = await browseApi.getVendor(vid);
              return [vid, v.business_name] as const;
            } catch {
              return null;
            }
          })
        );
        if (mounted) {
          const mapUpdates: Record<number, string> = {};
          for (const entry of entries) {
            if (entry) {
              mapUpdates[entry[0]] = entry[1];
            }
          }
          if (Object.keys(mapUpdates).length > 0) {
            setVendorNames((prev) => ({ ...prev, ...mapUpdates }));
          }
        }
      } catch {
        // graceful fallback
      }
    })();

    return () => {
      mounted = false;
    };
  }, [items, vendorNames]);

  const vendorGroups = useMemo(
    () => groupCartByVendor(items, vendorNames),
    [items, vendorNames]
  );

  const ongoingOrders = useMemo(() => {
    const list = orders.filter(isOngoingOrder);
    for (const sub of subscriptions) {
      if (sub.status !== 'cancelled' && sub.items && sub.items.length > 0) {
        const hasOrder = sub.order_id && orders.some((o) => o.id === sub.order_id);
        if (!hasOrder) {
          list.unshift({
            id: sub.order_id || sub.id,
            user_id: sub.user_id,
            parent_order_id: null,
            vendor_id: null,
            status: 'pending',
            delivery_time: sub.next_delivery || null,
            payment_status: 'pending',
            total_price: sub.total,
            created_at: sub.created_at,
            completed_at: null,
            items: sub.items.map((i, idx) => ({
              id: idx,
              product_id: null,
              vendor_id: null,
              marketplace_product_id: i.marketplace_product_id || i.product_id,
              quantity: i.quantity,
              price: i.price,
              product_name: i.name,
              vendor_name: 'FUDS Market',
            })),
          });
        }
      }
    }
    return list;
  }, [orders, subscriptions]);
  const historyOrders = useMemo(() => orders.filter(isHistoryOrder), [orders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={FudsColors.primary} size="large" />
      </SafeAreaView>
    );
  }

  // Bottom clearance for sticky footer
  const footerClearance = !isEmpty ? 150 + tabClearance : tabClearance + Spacing.three;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerSub}>Cart, ongoing & past orders</Text>
      </View>

      {/* Segment control */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentTrack}>
          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'cart' && styles.segmentBtnActive]}
            onPress={() => handleSegmentChange('cart')}
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
            style={[styles.segmentBtn, segment === 'ongoing' && styles.segmentBtnActive]}
            onPress={() => handleSegmentChange('ongoing')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="time"
              size={15}
              color={segment === 'ongoing' ? FudsColors.primaryForeground : FudsColors.mutedForeground}
            />
            <Text
              style={[styles.segmentText, segment === 'ongoing' && styles.segmentTextActive]}
            >
              Ongoing
              {ongoingOrders.length > 0 ? ` (${ongoingOrders.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'history' && styles.segmentBtnActive]}
            onPress={() => handleSegmentChange('history')}
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
              History
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
          <FlatList
            data={vendorGroups}
            keyExtractor={(group) => group.key}
            contentContainerStyle={{
              paddingHorizontal: Spacing.three,
              paddingTop: Spacing.one,
              paddingBottom: footerClearance,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              !isEmpty ? (
                <View style={styles.cartTopBar}>

                  <TouchableOpacity
                    style={styles.clearCartTopBtn}
                    onPress={handleClearCart}
                    disabled={checkingOut || vendorCheckingOutKey != null}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="trash-outline" size={14} color={FudsColors.destructive} />
                    <Text style={styles.clearCartTopBtnText}>Clear cart</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            renderItem={({ item: group }) => (
              <VendorCartCard
                group={group}
                onQuantityChange={changeQuantity}
                onPayVendor={handleVendorCheckout}
                isPayingVendor={vendorCheckingOutKey === group.key}
                disabled={checkingOut || vendorCheckingOutKey != null}
              />
            )}
            ListFooterComponent={
              !isEmpty && vendorGroups.length > 1 ? (
                <View style={styles.listFooterClearWrap}>
                  <TouchableOpacity
                    style={styles.clearCartListBtn}
                    onPress={handleClearCart}
                    disabled={checkingOut || vendorCheckingOutKey != null}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="trash-outline" size={14} color={FudsColors.destructive} />
                    <Text style={styles.clearCartListBtnText}>Clear cart</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
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
                     
                    router.push('/(app)/(tabs)/' as any);
                  }}
                >
                  <Text style={styles.browseBtnText}>Browse vendors</Text>
                  <Ionicons name="arrow-forward" size={14} color={FudsColors.primary} />
                </TouchableOpacity>
              </View>
            }
          />

          {!isEmpty && (
            <View style={[styles.footer, { paddingBottom: tabClearance }]}>
              <View style={styles.footerInner}>
                {/* Checkout actions row: Clear cart + Place & Pay */}
                <View style={styles.checkoutActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.clearCartBtn,
                      (checkingOut || vendorCheckingOutKey != null) && { opacity: 0.5 },
                    ]}
                    onPress={handleClearCart}
                    disabled={checkingOut || vendorCheckingOutKey != null}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="trash-outline" size={15} color={FudsColors.destructive} />
                    <Text style={styles.clearCartBtnText}>Clear cart</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.placeAndPayBtn,
                      (checkingOut || vendorCheckingOutKey != null) &&
                        styles.placeAndPayBtnDisabled,
                    ]}
                    onPress={handleCheckout}
                    disabled={checkingOut || vendorCheckingOutKey != null}
                    activeOpacity={0.88}
                  >
                    {checkingOut ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.placeAndPayText}>Place & Pay</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </>
      ) : segment === 'ongoing' ? (
        <FlatList
          data={ongoingOrders}
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
            const sub =
              subscriptionByOrderId.get(item.id) ||
              (subscriptions.length > 0 &&
              subscriptions[0].items &&
              subscriptions[0].items.length > 0 &&
              item.items?.some((i) => i.marketplace_product_id != null)
                ? subscriptions[0]
                : null);
            return (
              <OrderCard
                order={item}
                isOngoing={true}
                marketListSubscription={sub}
                onPay={() => openPayment(item.id, Number(item.total_price))}
                onEditMarketList={() => router.push('/(app)/market-list' as any)}
              />
            );
          }}
          ListEmptyComponent={
            ordersLoading ? (
              <ActivityIndicator color={FudsColors.primary} style={{ marginTop: 48 }} />
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(29,158,117,0.12)' }]}>
                  <Ionicons name="time-outline" size={40} color={FudsColors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No ongoing orders</Text>
                <Text style={styles.emptySubtitle}>
                  You don’t have any active orders right now.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                     
                    router.push('/(app)/(tabs)/' as any);
                  }}
                >
                  <Text style={styles.browseBtnText}>Browse vendors</Text>
                  <Ionicons name="arrow-forward" size={14} color={FudsColors.primary} />
                </TouchableOpacity>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={historyOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: Spacing.three,
            paddingBottom: tabClearance + Spacing.four,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshing={ordersLoading}
          onRefresh={loadOrders}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              isOngoing={false}
              onPay={() => openPayment(item.id, Number(item.total_price))}
            />
          )}
          ListEmptyComponent={
            ordersLoading ? (
              <ActivityIndicator color={FudsColors.primary} style={{ marginTop: 48 }} />
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="receipt-outline" size={40} color="#B45309" />
                </View>
                <Text style={styles.emptyTitle}>No order history yet</Text>
                <Text style={styles.emptySubtitle}>
                  When an order is completed, delivered, or cancelled, it will appear here.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                     
                    router.push('/(app)/(tabs)/' as any);
                  }}
                >
                  <Text style={styles.browseBtnText}>Browse vendors</Text>
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

  // Vendor group card
  vendorCard: {
    backgroundColor: FudsColors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: FudsColors.border,
    marginBottom: Spacing.three,
    overflow: 'hidden',
    ...FudsShadow.sm,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: FudsColors.border,
    backgroundColor: 'rgba(29,158,117,0.03)',
  },
  vendorHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  vendorIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '900',
    color: FudsColors.foreground,
  },
  vendorItemCount: {
    fontSize: 11,
    fontWeight: '600',
    color: FudsColors.mutedForeground,
    marginTop: 1,
  },
  vendorHeaderRight: {
    alignItems: 'flex-end',
  },
  vendorHeaderSubtotal: {
    fontSize: 14,
    fontWeight: '900',
    color: FudsColors.primary,
  },

  vendorItemsList: {
    paddingHorizontal: Spacing.three,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FudsColors.border,
    gap: 12,
  },
  productImageShell: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FudsColors.border,
    backgroundColor: FudsColors.muted,
  },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: { flex: 1, minWidth: 0 },
  productTitle: {
    fontWeight: '800',
    fontSize: 13,
    color: FudsColors.foreground,
    lineHeight: 17,
  },
  productUnitPrice: {
    fontSize: 11,
    color: FudsColors.mutedForeground,
    marginTop: 3,
    fontWeight: '600',
  },
  productSubtotal: {
    fontSize: 13,
    color: FudsColors.primary,
    fontWeight: '900',
    marginTop: 3,
  },

  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(29,158,117,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonPlus: { backgroundColor: FudsColors.primary },
  qtyText: {
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 13,
    color: FudsColors.foreground,
  },

  vendorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    backgroundColor: 'rgba(29,158,117,0.02)',
    borderTopWidth: 1,
    borderTopColor: FudsColors.border,
    gap: 12,
  },
  vendorSubtotalCol: {
    flex: 1,
  },
  vendorFooterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.mutedForeground,
  },
  vendorFooterAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: FudsColors.foreground,
    marginTop: 2,
  },
  payVendorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: FudsColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: FudsRadius.md,
    ...FudsShadow.sm,
  },
  payVendorBtnDisabled: { opacity: 0.55 },
  payVendorBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
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

  // Sticky bottom footer
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
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: FudsColors.mutedForeground, fontWeight: '700' },
  totalHint: { fontSize: 11, color: FudsColors.mutedForeground, marginTop: 1 },
  totalValue: { fontSize: 22, fontWeight: '900', color: FudsColors.foreground },

  checkoutActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Cart top-bar (item count + inline clear button)
  cartTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  cartTopCount: {
    fontSize: 13,
    fontWeight: '700',
    color: FudsColors.mutedForeground,
  },
  clearCartTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: FudsRadius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  clearCartTopBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: FudsColors.destructive,
  },

  // List footer clear button (shown below multiple vendor cards)
  listFooterClearWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  clearCartListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: FudsRadius.full,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  clearCartListBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: FudsColors.destructive,
  },

  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: FudsRadius.md,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  clearCartBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: FudsColors.destructive,
  },
  placeAndPayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: FudsColors.primary,
    height: 48,
    borderRadius: FudsRadius.md,
    ...FudsShadow.sm,
  },
  placeAndPayBtnDisabled: { opacity: 0.55 },
  placeAndPayText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Order Card styles (Ongoing & History)
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
  orderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.two,
    marginLeft: 6,
  },
  editListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: FudsRadius.md,
    borderWidth: 1.5,
    borderColor: FudsColors.primary,
    backgroundColor: FudsColors.card,
  },
  editListText: {
    fontSize: 13,
    fontWeight: '800',
    color: FudsColors.primary,
  },
  orderFreqBadge: {
    backgroundColor: 'rgba(29,158,117,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: FudsRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.3)',
  },
  orderFreqBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: FudsColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
