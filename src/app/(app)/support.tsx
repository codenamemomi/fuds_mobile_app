/**
 * Support — placeholder until live chat / tickets ship.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FudsColors, FudsShadow, Spacing } from '@/constants/theme';
import { safeGoBack } from '@/lib/navigation';

export default function SupportScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => safeGoBack('/(app)/(tabs)/profile')}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={FudsColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.orb}>
            <Ionicons name="chatbubbles" size={32} color={FudsColors.primary} />
          </View>
          <Text style={styles.title}>Coming soon</Text>
          <Text style={styles.copy}>
            Live chat and order help are on the way. You’ll be able to reach FUDS support from here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: FudsColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: FudsColors.foreground },
  body: { flex: 1, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  card: {
    backgroundColor: FudsColors.card,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...FudsShadow.sm,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(29,158,117,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: FudsColors.foreground },
  copy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: FudsColors.mutedForeground,
    textAlign: 'center',
  },
});
