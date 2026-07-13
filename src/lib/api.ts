/**
 * FUDS API Client
 * Connects to the FastAPI backend at /api/v1/*
 * Base URL is configured via app.json extras → Constants.expoConfig.extra.apiBaseUrl
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getToken } from './token';

const getApiBaseUrl = (): string => {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.15:8081"
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:8000`;
      }
    }
  }

  const configuredUrl = Constants.expoConfig?.extra?.apiBaseUrl as string;
  if (!configuredUrl) {
    return 'http://localhost:8000';
  }
  if (Platform.OS === 'android') {
    return configuredUrl;
  }
  if (configuredUrl.includes('10.0.2.2')) {
    return configuredUrl.replace('10.0.2.2', 'localhost');
  }
  return configuredUrl;
};

const BASE_URL: string = getApiBaseUrl();
if (__DEV__) {
  console.log('[FUDS API] Resolved BASE_URL:', BASE_URL);
}

const API_PREFIX = '/api/v1';

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

  const response = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    ...rest,
    headers,
  });

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
    min_price?: number;
    max_price?: number;
    page?: number;
    limit?: number;
  }) => request<Product[]>(`/browse/products${toQuery(params as Record<string, string | number | undefined | null>)}`),

  getProduct: (productId: number) =>
    request<ProductWithVendor>(`/browse/products/${productId}`),
};

// ─── Cart types (match CartItemCreate / CartItemUpdate / CartItemRead / CartRead) ──

export interface CartItemCreate {
  product_id: number;
  vendor_id: number;
  quantity?: number; // defaults to 1 server-side
}

export interface CartItemUpdate {
  product_id: number;
  quantity: number; // 0 removes the item server-side (ge=0)
}

/** Flat shape returned by GET /cart — not nested under product. */
export interface CartItemRead {
  product_id: number;
  vendor_id: number;
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
};

// ─── Order types (match OrderRead / OrderItemRead / CheckoutRequest) ──────────

export interface OrderItemRead {
  id: number;
  product_id: number;
  vendor_id: number;
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
