/**
 * KeyboardScreen — keeps inputs visible above the soft keyboard (esp. Android).
 *
 * Uses KeyboardAvoidingView + ScrollView + extra bottom padding while the
 * keyboard is open. Pair with app.json android.softwareKeyboardLayoutMode: "resize".
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** Extra top offset (e.g. custom header height). */
  offset?: number;
  scrollEnabled?: boolean;
  /** When true, scrolls up a bit as soon as the keyboard opens. */
  scrollOnKeyboardShow?: boolean;
};

export function KeyboardScreen({
  children,
  style,
  contentContainerStyle,
  offset = 0,
  scrollEnabled = true,
  scrollOnKeyboardShow = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      if (scrollOnKeyboardShow) {
        // Give the layout a tick to shrink, then lift content
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: 100, animated: true });
        }, 80);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollOnKeyboardShow]);

  // iOS: padding + safe area; Android: padding works with softwareKeyboardLayoutMode resize
  const verticalOffset =
    Platform.OS === 'ios' ? insets.top + offset : Math.max(insets.top, 0) + offset;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior="padding"
      keyboardVerticalOffset={verticalOffset}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          keyboardVisible && styles.contentKeyboardOpen,
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        // iOS 14+ / RN: auto-inset for focused field
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        bounces
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  contentKeyboardOpen: {
    // Room so the focused field can sit above the keyboard
    paddingBottom: 160,
  },
});
