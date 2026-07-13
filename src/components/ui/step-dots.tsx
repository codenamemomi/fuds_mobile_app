/**
 * StepDots — 3-dot progress indicator for the onboarding flow.
 * Active dot is full primary color; past dots are dimmed; future are border.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FudsColors, Spacing } from '@/constants/theme';

interface StepDotsProps {
  total?: number;
  current: number; // 1-indexed
}

export function StepDots({ total = 3, current }: StepDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isPast = step < current;
        return (
          <View
            key={step}
            style={[
              styles.dot,
              isActive && styles.dotActive,
              isPast && styles.dotPast,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FudsColors.border,
  },
  dotActive: {
    backgroundColor: FudsColors.primary,
  },
  dotPast: {
    backgroundColor: FudsColors.primary,
    opacity: 0.4,
  },
});
