/**
 * AddressEditModal — sheet to set/edit delivery address from Home (or elsewhere).
 * Uses AddressField so reverse geocode is always editable before save.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

  useEffect(() => {
    if (visible) {
      setAddress(initialAddress ?? '');
    }
  }, [visible, initialAddress]);

  const handleSave = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    await onSave(trimmed);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
