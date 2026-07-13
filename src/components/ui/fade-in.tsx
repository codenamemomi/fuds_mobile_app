/**
 * FadeIn — staggered entrance for list / grid items.
 */

import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  fromY?: number;
};

export function FadeIn({ children, delay = 0, style, fromY = 18 }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(fromY);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, opacity, scale, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}
