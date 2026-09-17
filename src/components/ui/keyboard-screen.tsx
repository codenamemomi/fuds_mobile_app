/**
 * KeyboardScreen — keeps inputs visible above the soft keyboard (esp. Android).
 *
 * Uses KeyboardAvoidingView + ScrollView + extra bottom padding while the
 * keyboard is open. Pair with app.json android.softwareKeyboardLayoutMode: "resize".
 */

import React from 'react';
import { Platform, StyleSheet, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  offset?: number;
  scrollEnabled?: boolean;
};

export function KeyboardScreen({
  children,
  style,
  contentContainerStyle,
  offset = 0,
  scrollEnabled = true,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAwareScrollView
      style={[styles.flex, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      bottomOffset={Platform.OS === 'ios' ? insets.bottom + offset + 20 : 40 + offset}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
      bounces
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
  },
});