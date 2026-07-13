/**
 * FudsButton — Primary CTA button styled to FUDS brand.
 * Shows an ActivityIndicator while `loading` is true.
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  View,
} from 'react-native';

import { FudsColors, FudsRadius, Spacing } from '@/constants/theme';

interface FudsButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  rightIcon?: React.ReactNode;
}

export function FudsButton({
  label,
  loading = false,
  variant = 'primary',
  rightIcon,
  disabled,
  style,
  ...props
}: FudsButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={disabled || loading}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? FudsColors.primaryForeground : FudsColors.primary}
        />
      ) : (
        <View style={styles.inner}>
          <Text style={[styles.label, !isPrimary && styles.ghostLabel]}>{label}</Text>
          {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: Spacing.three,
    borderRadius: FudsRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: FudsColors.primary,
    shadowColor: FudsColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    color: FudsColors.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ghostLabel: {
    color: FudsColors.primary,
  },
  icon: {
    marginLeft: 4,
  },
});
