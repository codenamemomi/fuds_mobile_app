/**
 * FUDS Design Tokens
 * Brand colors extracted from the HTML mockup design system.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── FUDS Brand Colors ────────────────────────────────────────────────────────

export const FudsColors = {
  background: '#F1EFE8',
  foreground: '#085041',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ─── FUDS-specific spacing ────────────────────────────────────────────────────

export const FudsRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
