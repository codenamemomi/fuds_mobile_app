/**
 * Floating circular pill tab bar — sits above the home indicator.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useFudsTheme } from '@/context/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { on: IonName; off: IonName }> = {
  index: { on: 'home', off: 'home-outline' },
  orders: { on: 'receipt', off: 'receipt-outline' },
  schedule: { on: 'calendar', off: 'calendar-outline' },
  profile: { on: 'person', off: 'person-outline' },
};

export const FLOATING_TAB_BAR_HEIGHT = 68;
export const FLOATING_TAB_BAR_GAP = 12;

export function floatingTabClearance(insetBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_GAP + Math.max(insetBottom, 8);
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, scheme } = useFudsTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10) + FLOATING_TAB_BAR_GAP;

  const glassFill =
    scheme === 'dark' ? 'rgba(16, 90, 68, 0.62)' : 'rgba(29, 158, 117, 0.58)';
  const glassEdge =
    scheme === 'dark' ? 'rgba(159, 225, 203, 0.28)' : 'rgba(159, 225, 203, 0.75)';
  const idleIcon = scheme === 'dark' ? 'rgba(232, 245, 240, 0.75)' : 'rgba(255, 255, 255, 0.82)';
  const idleLabel = scheme === 'dark' ? 'rgba(232, 245, 240, 0.7)' : 'rgba(255, 255, 255, 0.88)';

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: glassFill,
            borderColor: glassEdge,
            shadowColor: '#0b1f1a',
          },
        ]}
      >
        <View pointerEvents="none" style={styles.gloss} />
        <View pointerEvents="none" style={styles.glossSheen} />
        <View pointerEvents="none" style={styles.glossLine} />
        <View pointerEvents="none" style={styles.bottomShade} />
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
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.85}
              style={styles.item}
            >
              <View
                style={[
                  styles.orb,
                  focused && { backgroundColor: '#FFFFFF' },
                ]}
              >
                <Ionicons
                  name={focused ? icons.on : icons.off}
                  size={focused ? 22 : 20}
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
            </TouchableOpacity>
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    ...Platform.select({
      android: { elevation: 20 },
      default: {},
    }),
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '56%',
    backgroundColor: 'rgba(159, 225, 203, 0.38)',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  glossSheen: {
    position: 'absolute',
    top: -16,
    left: '10%',
    width: '55%',
    height: 40,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-12deg' }],
  },
  glossLine: {
    position: 'absolute',
    top: 1.5,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '32%',
    backgroundColor: 'rgba(8, 80, 65, 0.18)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 2,
  },
  orb: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
