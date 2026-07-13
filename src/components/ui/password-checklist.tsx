/**
 * Live password requirement checklist for register / change-password screens.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FudsColors, Spacing } from '@/constants/theme';
import { getPasswordRules } from '@/lib/password';

type Props = {
  password: string;
  /** When provided, also shows "Passwords match" row */
  confirm?: string;
};

export function PasswordChecklist({ password, confirm }: Props) {
  const rules = getPasswordRules(password, confirm);
  const show = password.length > 0 || (confirm !== undefined && (confirm?.length ?? 0) > 0);
  if (!show) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Password must include</Text>
      {rules.map((rule) => (
        <View key={rule.id} style={styles.row}>
          <Ionicons
            name={rule.ok ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={rule.ok ? FudsColors.primary : FudsColors.mutedForeground}
          />
          <Text style={[styles.label, rule.ok && styles.labelOk]}>{rule.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingVertical: Spacing.one,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: FudsColors.mutedForeground,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: FudsColors.mutedForeground,
    fontWeight: '600',
    flex: 1,
  },
  labelOk: {
    color: FudsColors.primary,
  },
});
