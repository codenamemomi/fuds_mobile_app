/**
 * Floating circular pill tab bar — sits above the home indicator.
 *
 * Indicator positioning strategy
 * ───────────────────────────────
 * Each tab button reports its actual layout via `onLayout`.  The indicator
 * target is computed from those measurements:
 *
 *   indicatorLeft = tab.x + tab.width / 2 − ORB_W / 2
 *
 * This avoids every source of coordinate-system mismatch (pill padding,
 * border-width, justifyContent, flex sizing) because both the flex children
 * and absolute-positioned indicator share the same parent coordinate origin
 * in React Native's layout engine.  No hardcoded pixel nudges required.
 */

import type { ComponentProps } from 'react';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { useFudsTheme } from '@/context/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { on: IonName; off: IonName }> = {
  index:    { on: 'home',     off: 'home-outline' },
  orders:   { on: 'receipt',  off: 'receipt-outline' },
  schedule: { on: 'calendar', off: 'calendar-outline' },
  profile:  { on: 'person',   off: 'person-outline' },
};

export const FLOATING_TAB_BAR_HEIGHT = 68;
export const FLOATING_TAB_BAR_GAP    = 12;

export function floatingTabClearance(insetBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_GAP + Math.max(insetBottom, 8);
}

// ─── Spring config — fast, subtle, no bounce ─────────────────────────────────
const SPRING = { damping: 22, stiffness: 340, mass: 0.8 } as const;

// ─── Orb dimensions ──────────────────────────────────────────────────────────
const ORB_W = 44;
const ORB_H = 40;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, scheme } = useFudsTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10) + FLOATING_TAB_BAR_GAP;
  const n      = state.routes.length;

  // ── Colour tokens ──────────────────────────────────────────────────────────
  const glassFill =
    scheme === 'dark' ? 'rgba(12, 78, 58, 0.72)' : 'rgba(22, 138, 103, 0.62)';
  const glassEdge =
    scheme === 'dark' ? 'rgba(159, 225, 203, 0.32)' : 'rgba(200, 240, 220, 0.80)';
  const idleIcon  =
    scheme === 'dark' ? 'rgba(210, 240, 228, 0.60)' : 'rgba(255, 255, 255, 0.72)';
  const idleLabel =
    scheme === 'dark' ? 'rgba(210, 240, 228, 0.55)' : 'rgba(255, 255, 255, 0.78)';

  // ── Per-tab measured layouts ───────────────────────────────────────────────
  // Each entry: { x, width } as reported by the tab button's onLayout.
  // x is relative to the pill's coordinate origin — same system used by
  // position:absolute children, so no offset correction is needed.
  const tabLayouts = useRef<Array<{ x: number; width: number } | null>>(
    Array(n).fill(null)
  );

  // ── Indicator shared value ─────────────────────────────────────────────────
  const indicatorX = useSharedValue(-ORB_W); // start off-screen until first layout

  // Returns the indicator's left edge for a measured tab layout
  const targetForLayout = (layout: { x: number; width: number }) =>
    layout.x + layout.width / 2 - ORB_W / 2;

  // Animate to the current focused tab whenever state.index changes
  useEffect(() => {
    const layout = tabLayouts.current[state.index];
    if (layout) {
      indicatorX.value = withSpring(targetForLayout(layout), SPRING);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: glassFill,
            borderColor: glassEdge,
            shadowColor: '#041a12',
          },
        ]}
      >
        {/* ── Glass decoration layers ───────────────────────────────────── */}
        <View pointerEvents="none" style={styles.gloss} />
        <View pointerEvents="none" style={styles.glossSheen} />
        <View pointerEvents="none" style={styles.glossLine} />
        <View pointerEvents="none" style={styles.bottomShade} />
        <View pointerEvents="none" style={styles.innerRim} />

        {/* ── Sliding active indicator ──────────────────────────────────── */}
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, indicatorStyle]}
        >
          {/* Orb is flex-centered within the full-height indicator lane */}
          <View style={styles.indicatorOrb}>
            <View style={styles.indicatorGloss} />
            <View style={styles.indicatorRing} />
          </View>
        </Animated.View>

        {/* ── Tab items ─────────────────────────────────────────────────── */}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const icons = ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline' };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <AnimatedPressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              scaleTo={0.9}
              style={styles.item}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                const prev = tabLayouts.current[index];
                // Skip re-processing if layout hasn't changed meaningfully
                if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.width - width) < 0.5) {
                  return;
                }
                tabLayouts.current[index] = { x, width };
                // If this tab is currently focused, (re)position the indicator.
                // First layout snaps; subsequent navigations use withSpring via useEffect.
                if (index === state.index) {
                  indicatorX.value = targetForLayout({ x, width });
                }
              }}
            >
              {/* Icon area — same size as the orb so it always sits centered over it */}
              <View style={styles.iconWrap}>
                <Ionicons
                  name={focused ? icons.on : icons.off}
                  size={focused ? 21 : 20}
                  color={focused ? colors.primary : idleIcon}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: focused ? '#FFFFFF' : idleLabel },
                  focused && styles.labelOn,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 18,
    right: 18,
    alignItems: 'center',
  },

  // ── Pill container ────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    height: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: 34,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    ...Platform.select({
      android: { elevation: 22 },
      default: {},
    }),
  },

  // ── Glass decoration layers ───────────────────────────────────────────────
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(180, 240, 215, 0.30)',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  glossSheen: {
    position: 'absolute',
    top: -18,
    left: '8%',
    width: '52%',
    height: 42,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    transform: [{ rotate: '-10deg' }],
  },
  glossLine: {
    position: 'absolute',
    top: 1.5,
    left: 22,
    right: 22,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
    backgroundColor: 'rgba(5, 60, 45, 0.20)',
  },
  innerRim: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 6,
    height: 1,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },

  // ── Sliding indicator ─────────────────────────────────────────────────────
  // Fills the full pill height so flexbox can center the orb vertically.
  // Horizontal position is driven entirely by translateX from measured tab layouts.
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: ORB_W,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorOrb: {
    width: ORB_W,
    height: ORB_H,
    borderRadius: ORB_H / 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
  },
  indicatorGloss: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    height: '48%',
    borderTopLeftRadius: ORB_H / 2,
    borderTopRightRadius: ORB_H / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  indicatorRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ORB_H / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(29, 158, 117, 0.25)',
  },

  // ── Tab items ─────────────────────────────────────────────────────────────
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 2,
  },
  iconWrap: {
    width: ORB_W,
    height: ORB_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelOn: {
    fontWeight: '800',
  },
});
