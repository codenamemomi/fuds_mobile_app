/**
 * AddressField — editable delivery address with optional "Use my location".
 *
 * Reverse-geocoded text is only a suggestion: it is written into the controlled
 * value so the user can fix estate gates / building numbers before save.
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FudsInput } from '@/components/ui/fuds-input';
import { FudsColors, FudsRadius, Spacing } from '@/constants/theme';
import { useLocation } from '@/hooks/use-location';

type AddressFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  /** Show the "Use my location" control (default true). */
  showLocateButton?: boolean;
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText'>;
};

export function AddressField({
  value,
  onChangeText,
  label = 'Delivery Address',
  placeholder = 'e.g. 12 Admiralty Way, Lekki Phase 1',
  error,
  showLocateButton = true,
  inputProps,
}: AddressFieldProps) {
  const { isLocating, error: locationError, getCurrentAddress, clearError } = useLocation();

  const handleUseLocation = async () => {
    clearError();
    const resolved = await getCurrentAddress();
    if (!resolved) return;
    // Suggestion only — never auto-save; parent keeps full edit control
    onChangeText(resolved.suggestedAddress);
  };

  return (
    <View style={styles.wrap}>
      <FudsInput
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        error={error}
        returnKeyType="done"
        leftContent={<Text style={styles.pin}>📍</Text>}
        {...inputProps}
      />

      {showLocateButton && (
        <TouchableOpacity
          style={styles.locateBtn}
          onPress={handleUseLocation}
          disabled={isLocating}
          activeOpacity={0.8}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={FudsColors.primary} />
          ) : (
            <Ionicons name="navigate" size={16} color={FudsColors.primary} />
          )}
          <Text style={styles.locateLabel}>
            {isLocating ? 'Finding location…' : 'Use my location'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.hint}>
        Location is a starting point — edit the street, estate gate, or landmark before saving.
      </Text>

      {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  pin: { fontSize: 16 },
  locateBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: FudsRadius.md,
    backgroundColor: 'rgba(29,158,117,0.12)',
  },
  locateLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: FudsColors.primary,
  },
  hint: {
    fontSize: 11,
    color: FudsColors.mutedForeground,
    lineHeight: 16,
  },
  locationError: {
    fontSize: 12,
    color: FudsColors.destructive,
    fontWeight: '600',
  },
});
