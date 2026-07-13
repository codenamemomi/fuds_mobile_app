/**
 * Splash Screen
 * Green background with FUDS logo, ambient glow, tagline.
 * Auto-navigates after 2.5s:
 *   - If token exists → /(app)
 *   - Otherwise → /(auth)/register
 */

import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FudsColors } from '@/constants/theme';
import { getToken } from '@/lib/token';

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Navigate after 2.5s
    const timer = setTimeout(async () => {
      const token = await getToken();
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(app)' as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(auth)/register' as any);
      }
    }, 2500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Ambient glow */}
        <View style={styles.ambientGlow} />

        {/* Spacer */}
        <View />

        {/* Brand identity */}
        <Animated.View
          style={[
            styles.brandBlock,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          {/* Logo box */}
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🥘</Text>
          </View>

          {/* Brand name + tagline */}
          <View style={styles.brandText}>
            <Text style={styles.brandName}>FUDS</Text>
            <Animated.Text style={[styles.brandTagline, { opacity: taglineOpacity }]}>
              LAGOS' PREMIUM FOOD &amp; GROCERY SCHEDULER
            </Animated.Text>
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
          <Text style={styles.footerText}>Breakfast · Lunch · Dinner</Text>
          <Animated.View style={[styles.pulseDot, { opacity: pulseOpacity }]} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

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
    top: 0,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: FudsColors.secondary,
    opacity: 0.2,
    // blur is not supported in RN without a library; use opacity for the effect
  },
  brandBlock: {
    alignItems: 'center',
    gap: 24,
  },
  logoBox: {
    width: 128,
    height: 128,
    backgroundColor: FudsColors.background,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 56,
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
