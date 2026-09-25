/**
 * Theme preference: light | dark | system.
 * Persisted in SecureStore (native) / memory (web).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import {
  FudsColorsDark,
  FudsColorsLight,
  type FudsColorPalette,
} from '@/constants/theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

const THEME_KEY = 'fuds.theme';

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ResolvedScheme;
  colors: FudsColorPalette;
  setPreference: (p: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function loadPreference(): Promise<ThemePreference> {
  try {
    if (Platform.OS === 'web') {
      const storage = (globalThis as { localStorage?: Storage }).localStorage;
      const v = storage?.getItem?.(THEME_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
      return 'system';
    }
    const SecureStore = await import('expo-secure-store');
    const v = await SecureStore.getItemAsync(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'system';
}

async function savePreference(p: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const storage = (globalThis as { localStorage?: Storage }).localStorage;
      storage?.setItem?.(THEME_KEY, p);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(THEME_KEY, p);
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPreference().then((p) => {
      setPreferenceState(p);
      setReady(true);
    });
  }, []);

  const scheme: ResolvedScheme = useMemo(() => {
    if (preference === 'system') {
      return system === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference, system]);

  const colors = useMemo(
    () => (scheme === 'dark' ? FudsColorsDark : FudsColorsLight),
    [scheme]
  );

  useEffect(() => {
    if (!ready) return;
    // Sync React Native appearance for system components (native only)
    if (typeof Appearance.setColorScheme === 'function') {
      if (preference === 'system') {
        Appearance.setColorScheme('unspecified');
      } else {
        Appearance.setColorScheme(preference);
      }
    }

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.style.backgroundColor = colors.background;
        document.body.style.backgroundColor = colors.background;
        document.documentElement.style.colorScheme = scheme;
      }
    } else {
      SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    }
  }, [preference, scheme, colors.background, ready]);

  const setPreference = useCallback(async (p: ThemePreference) => {
    setPreferenceState(p);
    await savePreference(p);
  }, []);

  const value = useMemo(
    () => ({ preference, scheme, colors, setPreference }),
    [preference, scheme, colors, setPreference]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useFudsTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for screens outside provider (should not happen)
    return {
      preference: 'system',
      scheme: 'light',
      colors: FudsColorsLight,
      setPreference: async () => {},
    };
  }
  return ctx;
}
