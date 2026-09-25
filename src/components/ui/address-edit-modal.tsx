/**
 * AddressEditModal — sheet to set/edit delivery address from Home (or elsewhere).
 * Uses AddressField so reverse geocode is always editable before save.
 */

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AddressField } from '@/components/ui/address-field';
import { FudsButton } from '@/components/ui/fuds-button';
import { FudsColors, FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
import { useState } from 'react';

type AddressEditModalProps = {
  visible: boolean;
  initialAddress?: string | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  /** Called with the user-edited address string (never auto-geocoded only). */
  onSave: (address: string) => void | Promise<void>;
};

export function AddressEditModal({
  visible,
  initialAddress,
  saving = false,
  error,
  onClose,
  onSave,
}: AddressEditModalProps) {
  const [address, setAddress] = useState(initialAddress ?? '');

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setAddress(initialAddress ?? '');
    }
  }, [visible, initialAddress]);

  // Animate in/out whenever visibility changes
  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      sheetY.setValue(300);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: 300,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropOpacity, sheetY]);

  const handleSave = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    await onSave(trimmed);
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      {/* Backdrop — pure fade, no translateY */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet — slides up from below */}
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Delivery address</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={FudsColors.foreground} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Where should we drop off your meals and groceries in Lagos?
          </Text>

          <AddressField
            value={address}
            onChangeText={setAddress}
            label="Delivering to"
            placeholder="Street, estate / landmark, area"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FudsButton
            label={saving ? 'Saving…' : 'Save address'}
            loading={saving}
            onPress={handleSave}
            disabled={!address.trim() || saving}
            style={{ marginTop: Spacing.two }}
          />
          {saving && (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color={FudsColors.primary} />
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,80,65,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: FudsColors.background,
    borderTopLeftRadius: FudsRadius.xl,
    borderTopRightRadius: FudsRadius.xl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    ...FudsShadow.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: FudsColors.border,
    marginBottom: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: FudsColors.foreground,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: FudsColors.mutedForeground,
    lineHeight: 18,
    marginBottom: Spacing.one,
  },
  error: {
    fontSize: 12,
    color: FudsColors.destructive,
    fontWeight: '600',
  },
  savingRow: {
    alignItems: 'center',
  },
});
