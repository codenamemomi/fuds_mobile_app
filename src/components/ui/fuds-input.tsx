/**
 * FudsInput — Reusable labeled text input styled to FUDS brand.
 * Mirrors the HTML mockup's input style: bordered card with icon prefix.
 */

import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { FudsColors, FudsRadius, Spacing } from '@/constants/theme';

interface FudsInputProps extends TextInputProps {
  label?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  error?: string;
}

export const FudsInput = forwardRef<TextInput, FudsInputProps>(
  ({ label, leftContent, rightContent, error, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={styles.wrapper}>
        {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
        <View
          style={[
            styles.inputRow,
            focused && styles.inputRowFocused,
            !!error && styles.inputRowError,
          ]}
        >
          {leftContent && <View style={styles.leftSlot}>{leftContent}</View>}
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={FudsColors.mutedForeground}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
          {rightContent && (
            <TouchableOpacity style={styles.rightSlot}>{rightContent}</TouchableOpacity>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

FudsInput.displayName = 'FudsInput';

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.foreground,
    letterSpacing: 1.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FudsColors.background,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    borderRadius: FudsRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputRowFocused: {
    borderColor: FudsColors.primary,
    shadowColor: FudsColors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputRowError: {
    borderColor: FudsColors.destructive,
  },
  input: {
    flex: 1,
    color: FudsColors.foreground,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  leftSlot: {
    marginRight: Spacing.two,
  },
  rightSlot: {
    marginLeft: Spacing.two,
    padding: 2,
  },
  errorText: {
    fontSize: 12,
    color: FudsColors.destructive,
    fontWeight: '500',
  },
});
