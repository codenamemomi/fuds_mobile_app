/**
 * FUDS API Client
 * Connects to the FastAPI backend at /api/v1/*
 *
 * Backend origin is configured in `@/config/backend` (EXPLICIT_BACKEND_URL,
 * Expo host, or app.json extra.apiBaseUrl).
 */

import { API_PREFIX, BACKEND_URL } from '@/config/backend';

import { getToken } from './token';

/** Backend origin — re-exported for screens that need it (debug, settings). */
export { API_PREFIX, apiUrl, BACKEND_URL, getBackendUrl } from '@/config/backend';

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface UserRead {
  id: number;
  fullname: string;
  phone: string;
  email: string | null;
  diet_goal: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  phone_verified: boolean;
}

export interface RegisterPayload {
  fullname: string;
  phone: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  password_confirm: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface UpdateProfilePayload {
  fullname?: string;
  phone?: string;
  email?: string;
  diet_goal?: string;
  address?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserRead;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${BACKEND_URL}${API_PREFIX}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot reach API at ${url} (${reason}). ` +
        `The live API is https://omomi.alwaysdata.net. Uninstall the old app and install a newly built APK.`
    );
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyOtp: (payload: VerifyOtpPayload) =>
    request<{ message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resendOtp: (payload: ResendOtpPayload) =>
    request<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
      auth: true,
    }),

  getMe: () => request<UserRead>('/auth/me', { auth: true }),

  updateProfile: (payload: UpdateProfilePayload) =>
    request<UserRead>('/auth/me', {
      method: 'PUT',
      auth: true,
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: ChangePasswordPayload) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),
};

// ─── Browse / Vendor / Product types (match backend schemas) ──────────────────

/** Fine-grained vendor type stored in DB */
export type VendorCategory =
  | 'restaurant'
  | 'grocery_store'
  | 'supermarket'
  | 'bakery'
  | 'pharmacy'
  | 'shop'
  | 'local_market'
  | 'package_delivery';

/** Consumer Home grid keys — pass as `group` to /browse/vendors */
export type BrowseGroupKey = 'food' | 'grocery' | 'shops' | 'pharmacy' | 'packages';

export interface BrowseCategory {
  key: BrowseGroupKey | string;
  label: string;
  subtitle: string;
  icon: string;
  vendor_categories: string[];
  vendor_count: number;
}

/** Matches api.v1.models.vendor.VendorStatus */
export type VendorStatus = 'activated' | 'suspended' | 'deactivated';

/** Matches api.v1.models.product.ProductCategory */
export type ProductCategory = VendorCategory;

export interface Vendor {
  id: number;
  business_name: string;
  category: VendorCategory | string | null;
  browse_group?: BrowseGroupKey | string | null;
  business_description: string | null;
  business_logo: string | null;
  cac: string | null;
  rc_number: string | null;
  address: string | null;
  tin: string | null;
  opening_time: string | null; // "HH:MM:SS"
  closing_time: string | null; // "HH:MM:SS"
  status: VendorStatus;
}

export interface Product {
  id: number;
  vendor_id: number;
  name: string;
  price: number;
  category: ProductCategory | null;
  aisle?: string | null;
  image_url: string | null;
}

export interface VendorWithProducts extends Vendor {
  products: Product[];
}

export interface ProductWithVendor extends Product {
  vendor_name: string | null;
  vendor_category: string | null;
  vendor_address: string | null;
}

export interface MarketplaceProduct {
  id: number;
  name: string;
  price: number;
  category: string | null;
  aisle: string | null;
  image_url: string | null;
}

/** Derive open/closed from status + opening/closing hours (backend has no is_open). */
export function isVendorOpen(vendor: Pick<Vendor, 'status' | 'opening_time' | 'closing_time'>): boolean {
  if (vendor.status !== 'activated') return false;
  if (!vendor.opening_time || !vendor.closing_time) return true;

  const parse = (t: string) => {
    const [h, m, s] = t.split(':').map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  };

  const now = new Date();
  const current = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const open = parse(vendor.opening_time);
  const close = parse(vendor.closing_time);

  // Overnight window (e.g. 16:00 → 23:59 or 22:00 → 02:00)
  if (close < open) {
    return current >= open || current <= close;
  }
  return current >= open && current <= close;
}

// ─── Browse endpoints ─────────────────────────────────────────────────────────

function toQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return q ? `?${q}` : '';
}

export const browseApi = {
  /** Home category grid — Food, Grocery, Shops, Pharmacy, Packages */
  listCategories: () => request<BrowseCategory[]>('/browse/categories'),

  listVendors: (params?: {
    category?: string;
    group?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => request<Vendor[]>(`/browse/vendors${toQuery(params)}`),

  /** Returns products inline — no second listProducts call needed for detail screens. */
  getVendor: (vendorId: number) =>
    request<VendorWithProducts>(`/browse/vendors/${vendorId}`),

  listProducts: (params?: {
    vendor_id?: number;
    category?: string;
    group?: string;
    name?: string;
    /** Alias for name — meal typeahead */
    search?: string;
    min_price?: number;
    max_price?: number;
    page?: number;
    limit?: number;
  }) =>
    request<ProductWithVendor[]>(
      `/browse/products${toQuery(params as Record<string, string | number | undefined | null>)}`
    ),

  /** Debounced typeahead helper — meals matching query */
  searchMeals: (query: string, opts?: { limit?: number; group?: string }) =>
    request<ProductWithVendor[]>(
      `/browse/products${toQuery({
        search: query.trim(),
        limit: opts?.limit ?? 10,
        group: opts?.group,
      })}`
    ),

  getProduct: (productId: number) =>
    request<ProductWithVendor>(`/browse/products/${productId}`),
};

// ─── Marketplace endpoints ────────────────────────────────────────────────────

export interface GroceryAisleRead {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  product_count: number;
}

export interface GroceryCatalogRead {
  aisles: GroceryAisleRead[];
  products: MarketplaceProduct[];
}

export interface GroceryItemCreate {
  product_id: number;
  quantity?: number;
}

export interface GrocerySubscriptionRead {
  id: number;
  user_id: number;
  frequency: string;
  next_delivery: string | null;
  status: string;
  order_id: number | null;
  created_at: string;
  items: Array<{
    product_id: number;
    quantity: number;
    name: string;
    price: number;
    subtotal: number;
    aisle: string | null;
    image_url: string | null;
    vendor_id: number | null;
    vendor_name: string | null;
    marketplace_product_id: number | null;
  }>;
  item_count: number;
  total: number;
  payment_status: string | null;
  added_items: Array<{ product_id: number; name: string; quantity: number; amount: number }>;
  removed_items: Array<{ product_id: number; name: string; quantity: number; amount: number }>;
  change_total: number;
}

export interface GrocerySubscriptionUpdate {
  items?: GroceryItemCreate[];
  frequency?: string;
  next_delivery?: string;
  status?: string;
}

export const marketplaceApi = {
  listAisles: () => request<GroceryAisleRead[]>('/marketplace/aisles'),

  getCatalog: (params?: { aisle?: string; search?: string }) =>
    request<GroceryCatalogRead>(`/marketplace/catalog${toQuery(params as Record<string, string | number | undefined | null>)}`),

  listEssentials: (search?: string) =>
    request<MarketplaceProduct[]>(`/marketplace/essentials${toQuery({ search })}`),

  createShoppingList: (items: GroceryItemCreate[], frequency: string = 'weekly') =>
    request<GrocerySubscriptionRead>('/marketplace/subscriptions', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ items, frequency }),
    }),

  listShoppingLists: () =>
    request<GrocerySubscriptionRead[]>('/marketplace/subscriptions', { auth: true }),

  updateShoppingList: (subscriptionId: number, payload: GrocerySubscriptionUpdate) =>
    request<GrocerySubscriptionRead>(`/marketplace/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify(payload),
    }),

  cancelShoppingList: (subscriptionId: number) =>
    request<{ message: string }>(`/marketplace/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      auth: true,
    }),

  checkoutShoppingList: (subscriptionId: number, cycles: number = 1) =>
    request<OrderRead>(`/marketplace/subscriptions/${subscriptionId}/checkout`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ cycles }),
    }),
};

// ─── Cart types (match CartItemCreate / CartItemUpdate / CartItemRead / CartRead) ──

export interface CartItemCreate {
  product_id?: number;
  marketplace_product_id?: number;
  vendor_id?: number;
  quantity?: number; // defaults to 1 server-side
}

export interface CartItemUpdate {
  product_id?: number;
  marketplace_product_id?: number;
  quantity: number; // 0 removes the item server-side (ge=0)
}

/** Flat shape returned by GET /cart — not nested under product. */
export interface CartItemRead {
  product_id: number | null;
  marketplace_product_id: number | null;
  vendor_id: number | null;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url: string | null;
}

export interface CartRead {
  user_id: number;
  items: CartItemRead[];
  total: number;
  item_count: number;
}

// ─── Cart endpoints ───────────────────────────────────────────────────────────

export const cartApi = {
  addItem: (payload: CartItemCreate) =>
    request<CartRead>('/cart/add', { method: 'POST', auth: true, body: JSON.stringify(payload) }),

  getCart: () => request<CartRead>('/cart', { auth: true }),

  clearCart: () =>
    request<{ message: string }>('/cart', { method: 'DELETE', auth: true }),

  updateItem: (payload: CartItemUpdate) =>
    request<CartRead>('/cart/update', { method: 'PUT', auth: true, body: JSON.stringify(payload) }),

  removeItem: (productId: number) =>
    request<CartRead>(`/cart/item/${productId}`, { method: 'DELETE', auth: true }),

  removeMarketplaceItem: (productId: number) =>
    request<CartRead>(`/cart/marketplace-item/${productId}`, { method: 'DELETE', auth: true }),
};

// ─── Order types (match OrderRead / OrderItemRead / CheckoutRequest) ──────────

export interface OrderItemRead {
  id: number;
  product_id: number | null;
  marketplace_product_id: number | null;
  vendor_id: number | null;
  quantity: number;
  price: number;
  product_name: string | null;
  vendor_name: string | null;
}

export interface OrderRead {
  id: number;
  user_id: number;
  parent_order_id: number | null;
  vendor_id: number | null;
  status: string;
  delivery_time: string | null;
  payment_status: string;
  total_price: number;
  created_at: string;
  completed_at: string | null;
  items: OrderItemRead[];
}

export interface CheckoutRequest {
  delivery_time?: string; // ISO datetime, optional
}

// ─── Order endpoints ──────────────────────────────────────────────────────────

export const ordersApi = {
  checkout: (payload: CheckoutRequest = {}) =>
    request<OrderRead>('/orders/checkout', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),

  listOrders: () => request<OrderRead[]>('/orders', { auth: true }),

  getOrder: (orderId: number) => request<OrderRead>(`/orders/${orderId}`, { auth: true }),
};

// ─── Payment types (Paystack card + bank transfer via Initialize Transaction) ─

export interface InitializePaymentRequest {
  order_id: number;
  callback_url?: string;
}

export interface InitializePaymentResponse {
  payment_id: number;
  order_id: number;
  reference: string;
  access_code: string;
  authorization_url: string;
  amount: number;
  amount_kobo: number;
  currency: string;
  status: string;
  payment_method: string;
}

export interface InitializeTransferRequest {
  order_id: number;
  callback_url?: string;
}

export interface TransferAccountDetails {
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_slug?: string | null;
}

/** Pay with Transfer — hosted checkout (channels bank_transfer), not Dedicated NUBAN */
export interface InitializeTransferResponse {
  payment_id: number;
  order_id: number;
  reference: string;
  access_code: string;
  authorization_url: string;
  amount: number;
  amount_kobo: number;
  currency: string;
  status: string;
  payment_method: string;
  channel: string;
  instructions: string;
  account?: TransferAccountDetails | null;
  expires_hint?: string | null;
}

export interface PaymentRead {
  id: number;
  user_id: number;
  order_id: number;
  amount: number;
  amount_kobo: number;
  currency: string;
  provider: string;
  payment_method: string;
  reference: string;
  access_code?: string | null;
  authorization_url?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  bank_name?: string | null;
  bank_slug?: string | null;
  account_expires_at?: string | null;
  status: string;
  provider_status?: string | null;
  channel?: string | null;
  gateway_response?: string | null;
  provider_transaction_id?: string | null;
  paystack_customer_code?: string | null;
  paid_at?: string | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface VerifyPaymentResponse {
  payment: PaymentRead;
  order_payment_status: string;
  message: string;
}

// ─── Payment endpoints ────────────────────────────────────────────────────────

export const paymentsApi = {
  /** Paystack hosted card / wallet checkout → open authorization_url in browser */
  initialize: (payload: InitializePaymentRequest) =>
    request<InitializePaymentResponse>('/payments/initialize', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),

  /** Pay with Transfer — Initialize Transaction with channels=["bank_transfer"] */
  initializeTransfer: (payload: InitializeTransferRequest) =>
    request<InitializeTransferResponse>('/payments/transfer/initialize', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),

  /** Confirm payment status with Paystack / local webhook state */
  verify: (reference: string) =>
    request<VerifyPaymentResponse>(`/payments/verify/${encodeURIComponent(reference)}`, {
      auth: true,
    }),

  listPayments: () => request<PaymentRead[]>('/payments', { auth: true }),

  getPayment: (paymentId: number) =>
    request<PaymentRead>(`/payments/${paymentId}`, { auth: true }),
};

// ─── 111 schedule ─────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealWindowRead {
  meal_type: MealType | string;
  label: string;
  start: string;
  end: string;
  range_label: string;
  slot_times: string[];
}

export interface ScheduledMealRead {
  id: number;
  user_id: number;
  meal_type: MealType | string;
  delivery_date: string;
  delivery_time: string;
  slot_time: string;
  vendor_id: number | null;
  product_id: number | null;
  quantity: number;
  order_id: number | null;
  status: string;
  created_at: string;
  product_name: string | null;
  product_price: number | null;
  product_image_url: string | null;
  vendor_name: string | null;
  subtotal: number | null;
}

export interface ScheduleDayRead {
  date: string;
  weekday: string;
  label: string;
  is_today: boolean;
  is_past: boolean;
  available_slots: Record<string, string[]>;
  meals: Record<string, ScheduledMealRead[]>;
}

export interface ScheduleWeekRead {
  timezone: string;
  windows: MealWindowRead[];
  days: ScheduleDayRead[];
}

export interface ScheduledMealCreate {
  meal_type: MealType;
  delivery_date: string;
  slot_time: string;
  product_id?: number;
  quantity?: number;
}

export interface ScheduledMealUpdate {
  slot_time?: string;
  product_id?: number;
  quantity?: number;
  clear_product?: boolean;
}

export interface ScheduleCheckoutRequest {
  delivery_date: string;
  meal_types?: MealType[];
}

export const scheduleApi = {
  listWindows: () => request<MealWindowRead[]>('/schedule/windows'),

  getWeek: (start?: string) =>
    request<ScheduleWeekRead>(`/schedule/week${toQuery({ start })}`, { auth: true }),

  list: (deliveryDate?: string) =>
    request<ScheduledMealRead[]>(
      `/schedule${toQuery({ delivery_date: deliveryDate })}`,
      { auth: true }
    ),

  upsert: (payload: ScheduledMealCreate) =>
    request<ScheduledMealRead>('/schedule', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),

  update: (mealId: number, payload: ScheduledMealUpdate) =>
    request<ScheduledMealRead>(`/schedule/${mealId}`, {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify(payload),
    }),

  remove: (mealId: number) =>
    request<{ message: string }>(`/schedule/${mealId}`, {
      method: 'DELETE',
      auth: true,
    }),

  checkout: (payload: ScheduleCheckoutRequest) =>
    request<OrderRead>('/schedule/checkout', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    }),
};
