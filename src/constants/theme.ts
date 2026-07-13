/**
 * FUDS Design Tokens
 * Brand colors extracted from the HTML mockup design system.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── FUDS Brand Colors ────────────────────────────────────────────────────────

/** Brand tokens from FUDS Food Delivery App-cursor-projects design system */
export const FudsColors = {
  background: '#F1EFE8',
  foreground: '#085041',
  tertiary: '#085041',
  primary: '#1D9E75',
  primaryForeground: '#FFFFFF',
  secondary: '#9FE1CB',
  secondaryForeground: '#085041',
  muted: '#DADFD7',
  mutedForeground: '#6B7280',
  accent: '#CFE2D6',
  accentForeground: '#085041',
  card: '#FFFFFF',
  cardForeground: '#085041',
  destructive: '#EF4444',
  border: '#D8D4C8',
  input: '#D8D4C8',
  ring: '#1D9E75',
  openBg: '#ECFDF5',
  openText: '#059669',
  amber: '#F59E0B',
} as const;

/** Promo images used in the HTML mockups */
export const FudsImages = {
  jollof:
    'https://uxmagic.blob.core.windows.net/public/agent-images/promo-jollof-1783775809565-crlnasg33v8.png',
  groceries:
    'https://uxmagic.blob.core.windows.net/public/agent-images/promo-groceries-1783775818633-60yc70b5oac.png',
} as const;

/** Soft card shadow matching mockup shadow-theme */
export const FudsShadow = {
  sm: {
    shadowColor: 'rgba(15, 23, 42, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: 'rgba(15, 23, 42, 0.12)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
} as const;

// ─── Legacy theme colors (kept for existing components) ───────────────────────

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Space reserved for NativeTabs bar so sticky footers (e.g. Checkout)
 * don't sit under the tab icons. Includes typical bar height only —
 * combine with useSafeAreaInsets().bottom when needed.
 */
export const BottomTabInset = Platform.select({ ios: 88, android: 72 }) ?? 72;
export const MaxContentWidth = 800;

// ─── FUDS-specific spacing ────────────────────────────────────────────────────

export const FudsRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
