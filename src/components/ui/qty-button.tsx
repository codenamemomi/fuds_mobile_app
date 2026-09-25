/**
 * QtyButton — Animated +/− button with a soft squish-and-spring press effect.
 *
 * Uses the same react-native-reanimated spring pattern as AnimatedPressable
 * but tuned specifically for small, repeated-tap quantity controls.
 * The animation re-triggers on every press, including rapid successive taps.
 */

/* eslint-disable react-hooks/immutability */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QtyButtonProps extends PressableProps {
  /** 'add' renders a + icon, 'remove' renders a − icon */
  variant: 'add' | 'remove';
  /** Optional icon name override (e.g. 'trash-outline') */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Icon size — defaults to 15 */
  iconSize?: number;
  /** Button background colour */
  backgroundColor?: string;
  /** Icon / content colour */
  tintColor?: string;
  /** Side length of the square button — defaults to 28 */
  size?: number;
  /** Border-radius — defaults to 9 */
  radius?: number;
  /** Optional custom or positioning style */
  style?: StyleProp<ViewStyle>;
}

/**
 * A compact quantity +/− button with a soft squish-and-spring press animation.
 * Every tap — including rapid repeated taps — re-triggers the animation.
 */
export function QtyButton({
  variant,
  iconName,
  iconSize = 15,
  backgroundColor = 'rgba(255,255,255,0.18)',
  tintColor = '#fff',
  size = 28,
  radius = 9,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: QtyButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    // Jump to compressed immediately, then spring back — works for rapid taps too
    scale.value = withSpring(0.78, {
      damping: 18,
      stiffness: 480,
      mass: 0.6,
    });
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    scale.value = withSpring(1, {
      damping: 11,
      stiffness: 300,
      mass: 0.6,
    });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: disabled ? 'rgba(255,255,255,0.08)' : backgroundColor,
        },
        style,
        animStyle,
      ]}
      hitSlop={6}
    >
      <Ionicons
        name={iconName ?? (variant === 'add' ? 'add' : 'remove')}
        size={iconSize}
        color={disabled ? 'rgba(255,255,255,0.4)' : tintColor}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
