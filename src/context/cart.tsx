/**
 * CartContext — shared, app-wide cart state.
 *
 * Both the Home screen (Featured Products), Vendor screen, and Orders/Cart screen consume
 * this context so they always display the exact same quantity values and never fall
 * out of sync when items are added, removed, or cleared on any screen.
 *
 * Implements optimistic updates so taps on +/− feel instant and responsive with zero lag.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  cartApi,
  type CartItemRead,
  type CartRead,
} from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddItemArgs {
  product_id?: number;
  vendor_id?: number;
  marketplace_product_id?: number;
  quantity?: number;
  price?: number;
  vendor_name?: string | null;
  name?: string;
}

interface CartContextValue {
  /** The current cart, or null if not yet loaded */
  cart: CartRead | null;
  /** Direct state updater for optimistic updates */
  setCart: React.Dispatch<React.SetStateAction<CartRead | null>>;
  /** True while the initial cart fetch is in flight */
  cartLoading: boolean;
  /** Re-fetches the cart from the server and updates shared state */
  refreshCart: () => Promise<void>;
  /** Add product or marketplace item to the cart with optimistic UI update */
  addItem: (args: AddItemArgs) => Promise<CartRead>;
  /**
   * Update the quantity of a cart item. Pass quantity ≤ 0 to remove it.
   * Handles both vendor products and marketplace products with optimistic UI update.
   */
  updateItem: (item: CartItemRead, newQty: number) => Promise<CartRead>;
  /** Remove a specific item entirely with optimistic UI update */
  removeItem: (item: CartItemRead) => Promise<CartRead>;
  /** Clear the entire cart with optimistic UI update */
  clearCart: () => Promise<CartRead>;
  /** Convenience: how many of a given product_id are in the cart */
  getQty: (productId: number) => number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: CartRead = { user_id: 0, items: [], total: 0, item_count: 0 };

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartRead | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const fetchingRef = useRef(false);

  const refreshCart = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await cartApi.getCart();
      setCart(data);
    } catch {
      // Keep last known state on transient network blips
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setCartLoading(true);
      await refreshCart();
      setCartLoading(false);
    })();
  }, [refreshCart]);

  const addItem = useCallback(
    async (args: AddItemArgs) => {
      const qtyToAdd = args.quantity ?? 1;

      // Optimistic state update: update cart synchronously before network roundtrip
      setCart((prev) => {
        const base = prev ?? { user_id: 0, items: [], total: 0, item_count: 0 };
        const items = [...base.items];
        const matchIndex = items.findIndex((i) =>
          args.product_id != null
            ? i.product_id === args.product_id
            : i.marketplace_product_id != null &&
              i.marketplace_product_id === args.marketplace_product_id
        );

        if (matchIndex >= 0) {
          const item = items[matchIndex];
          const newQty = item.quantity + qtyToAdd;
          const unitPrice = item.price || (args.price ?? 0);
          items[matchIndex] = {
            ...item,
            quantity: newQty,
            subtotal: unitPrice ? Number((unitPrice * newQty).toFixed(2)) : item.subtotal,
          };
        } else {
          const unitPrice = args.price ?? 0;
          items.push({
            product_id: args.product_id ?? null,
            marketplace_product_id: args.marketplace_product_id ?? null,
            vendor_id: args.vendor_id ?? null,
            vendor_name: args.vendor_name ?? null,
            name: args.name ?? '',
            price: unitPrice,
            quantity: qtyToAdd,
            subtotal: unitPrice ? Number((unitPrice * qtyToAdd).toFixed(2)) : 0,
            image_url: null,
          });
        }

        const newCount = items.reduce((sum, i) => sum + i.quantity, 0);
        const newTotal = items.reduce(
          (sum, i) => sum + (i.subtotal != null ? i.subtotal : i.price * i.quantity),
          0
        );

        return {
          ...base,
          items,
          item_count: newCount,
          total: Number(newTotal.toFixed(2)),
        };
      });

      try {
        const updated = await cartApi.addItem({
          ...(args.product_id != null ? { product_id: args.product_id } : {}),
          ...(args.vendor_id != null ? { vendor_id: args.vendor_id } : {}),
          ...(args.marketplace_product_id != null
            ? { marketplace_product_id: args.marketplace_product_id }
            : {}),
          quantity: qtyToAdd,
        });
        setCart(updated);
        return updated;
      } catch (err) {
        // Revert to authoritative server state on error
        await refreshCart();
        throw err;
      }
    },
    [refreshCart]
  );

  const itemQueuesRef = useRef<
    Map<
      string,
      {
        targetQty: number;
        timer?: ReturnType<typeof setTimeout>;
        inFlight: boolean;
        item: CartItemRead;
        resolvers: Array<{
          resolve: (cart: CartRead) => void;
          reject: (err: unknown) => void;
        }>;
      }
    >
  >(new Map());

  const updateItem = useCallback(
    (item: CartItemRead, newQty: number): Promise<CartRead> => {
      const key =
        item.product_id != null
          ? `p-${item.product_id}`
          : `m-${item.marketplace_product_id}`;

      // 1. Optimistic state update: immediate 0ms UI response
      setCart((prev) => {
        if (!prev) return prev;
        let items = [...prev.items];
        if (newQty <= 0) {
          items = items.filter((i) =>
            item.product_id != null
              ? i.product_id !== item.product_id
              : i.marketplace_product_id !== item.marketplace_product_id
          );
        } else {
          const idx = items.findIndex((i) =>
            item.product_id != null
              ? i.product_id === item.product_id
              : i.marketplace_product_id === item.marketplace_product_id
          );
          if (idx >= 0) {
            const current = items[idx];
            items[idx] = {
              ...current,
              quantity: newQty,
              subtotal: current.price ? Number((current.price * newQty).toFixed(2)) : current.subtotal,
            };
          }
        }

        const newCount = items.reduce((sum, i) => sum + i.quantity, 0);
        const newTotal = items.reduce(
          (sum, i) => sum + (i.subtotal != null ? i.subtotal : i.price * i.quantity),
          0
        );

        return {
          ...prev,
          items,
          item_count: newCount,
          total: Number(newTotal.toFixed(2)),
        };
      });

      // 2. Queue and debounce network requests to prevent race conditions on rapid taps
      return new Promise<CartRead>((resolve, reject) => {
        let entry = itemQueuesRef.current.get(key);
        if (!entry) {
          entry = {
            targetQty: newQty,
            inFlight: false,
            item,
            resolvers: [],
          };
          itemQueuesRef.current.set(key, entry);
        }

        entry.targetQty = newQty;
        entry.item = item;
        entry.resolvers.push({ resolve, reject });

        if (entry.timer) {
          clearTimeout(entry.timer);
        }

        const flush = async () => {
          const currentEntry = itemQueuesRef.current.get(key);
          if (!currentEntry || currentEntry.inFlight) return;

          currentEntry.inFlight = true;
          const target = currentEntry.targetQty;
          const targetItem = currentEntry.item;
          const currentResolvers = [...currentEntry.resolvers];
          currentEntry.resolvers = [];

          try {
            let updated: CartRead;
            if (target <= 0) {
              updated =
                targetItem.marketplace_product_id != null
                  ? await cartApi.removeMarketplaceItem(targetItem.marketplace_product_id)
                  : await cartApi.removeItem(targetItem.product_id!);
            } else {
              updated = await cartApi.updateItem({
                ...(targetItem.marketplace_product_id != null
                  ? { marketplace_product_id: targetItem.marketplace_product_id }
                  : { product_id: targetItem.product_id! }),
                quantity: target,
              });
            }

            const latestEntry = itemQueuesRef.current.get(key);
            if (latestEntry && latestEntry.targetQty !== target) {
              latestEntry.inFlight = false;
              // User tapped again while the request was in flight — flush latest target
              flush();
            } else {
              if (latestEntry) {
                latestEntry.inFlight = false;
                itemQueuesRef.current.delete(key);
              }
              setCart(updated);
            }

            for (const r of currentResolvers) {
              r.resolve(updated);
            }
          } catch (err) {
            const latestEntry = itemQueuesRef.current.get(key);
            if (latestEntry) {
              latestEntry.inFlight = false;
              itemQueuesRef.current.delete(key);
            }
            await refreshCart();
            for (const r of currentResolvers) {
              r.reject(err);
            }
          }
        };

        // When reducing to 0, flush promptly (60ms); for increment/decrement debounce 200ms
        const delay = newQty <= 0 ? 60 : 200;
        entry.timer = setTimeout(flush, delay);
      });
    },
    [refreshCart]
  );

  const removeItem = useCallback(
    async (item: CartItemRead) => {
      // Optimistic update
      setCart((prev) => {
        if (!prev) return prev;
        const items = prev.items.filter((i) =>
          item.product_id != null
            ? i.product_id !== item.product_id
            : i.marketplace_product_id !== item.marketplace_product_id
        );
        const newCount = items.reduce((sum, i) => sum + i.quantity, 0);
        const newTotal = items.reduce(
          (sum, i) => sum + (i.subtotal != null ? i.subtotal : i.price * i.quantity),
          0
        );
        return {
          ...prev,
          items,
          item_count: newCount,
          total: Number(newTotal.toFixed(2)),
        };
      });

      try {
        const updated =
          item.marketplace_product_id != null
            ? await cartApi.removeMarketplaceItem(item.marketplace_product_id)
            : await cartApi.removeItem(item.product_id!);
        setCart(updated);
        return updated;
      } catch (err) {
        await refreshCart();
        throw err;
      }
    },
    [refreshCart]
  );

  const clearCart = useCallback(async () => {
    // Cancel any pending debounced timers
    itemQueuesRef.current.forEach((entry) => {
      if (entry.timer) clearTimeout(entry.timer);
    });
    itemQueuesRef.current.clear();

    // Optimistic update
    setCart((prev) => ({ ...EMPTY_CART, user_id: prev?.user_id ?? 0 }));
    try {
      await cartApi.clearCart();
      const empty: CartRead = { ...EMPTY_CART, user_id: 0 };
      setCart((prev) => ({ ...empty, user_id: prev?.user_id ?? 0 }));
      return empty;
    } catch (err) {
      await refreshCart();
      throw err;
    }
  }, [refreshCart]);

  const getQty = useCallback(
    (productId: number): number => {
      if (!cart?.items) return 0;
      return cart.items
        .filter((i) => i.product_id === productId)
        .reduce((sum, i) => sum + i.quantity, 0);
    },
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        cartLoading,
        refreshCart,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        getQty,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return ctx;
}
