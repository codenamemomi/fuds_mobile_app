/**
 * Legacy hook — uses Colors.light / Colors.dark.
 * Prefer useFudsTheme() from @/context/theme for brand-aware theming.
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  return Colors[theme];
}
