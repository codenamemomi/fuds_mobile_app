/**
 * Splash Screen
 * Green background with FUDS logo (app icon), shine + glow animations, tagline.
 * Auto-navigates after ~2.8s:
 *   - If token exists → /(app)
 *   - Otherwise → /(auth)/register
 */

import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FudsColors } from '@/constants/theme';
import { getToken } from '@/lib/token';

const LOGO = require('@/assets/images/icon.png');

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;
  const glowPulse = useRef(new Animated.Value(0.35)).current;
  const shineX = useRef(new Animated.Value(-140)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance: fade + spring scale
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 72,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();

    // Soft ambient glow breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.7,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.35,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle float on the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -6,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Diagonal shine sweep across the logo (repeats)
    const runShine = () => {
      shineX.setValue(-140);
      Animated.timing(shineX, {
        toValue: 200,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
    };
    const shineStart = setTimeout(runShine, 700);
    const shineLoop = setInterval(runShine, 2400);

    // Footer pulse bar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(async () => {
      const token = await getToken();
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(app)' as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(auth)/register' as any);
      }
    }, 2800);

    return () => {
      clearTimeout(timer);
      clearTimeout(shineStart);
      clearInterval(shineLoop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.ambientGlow, { opacity: glowPulse }]} />

        <View />

        <Animated.View
          style={[
            styles.brandBlock,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: floatY }],
            },
          ]}
        >
          {/* Logo itself (no placeholder box) + shine sweep */}
          <View style={styles.logoWrap}>
            <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shineBand,
                {
                  transform: [
                    { translateX: shineX },
                    { rotate: '22deg' },
                  ],
                },
              ]}
            />
          </View>

          <View style={styles.brandText}>
            <Text style={styles.brandName}>FUDS</Text>
            <Animated.Text style={[styles.brandTagline, { opacity: taglineOpacity }]}>
              FOODS DELIVERED SMART
            </Animated.Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
          <Text style={styles.footerText}>Breakfast · Lunch · Dinner</Text>
          <Animated.View style={[styles.pulseDot, { opacity: pulseOpacity }]} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const LOGO_SIZE = 132;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FudsColors.primary,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  ambientGlow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: FudsColors.secondary,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 22,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 32,
    overflow: 'hidden',
    // Soft lift so the mark reads off the green field
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  /** Light band that sweeps across the logo for a shine */
  shineBand: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 48,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  brandText: {
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 40,
    fontWeight: '900',
    color: FudsColors.primaryForeground,
    letterSpacing: 6,
  },
  brandTagline: {
    fontSize: 11,
    color: FudsColors.secondary,
    fontWeight: '500',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  footerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  pulseDot: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: FudsColors.secondary,
  },
});
