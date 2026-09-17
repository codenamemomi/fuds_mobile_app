/**
 * 111 Meal Planner — breakfast 8–11am, lunch 1–4pm, dinner 5–7pm, Mon–Sun.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FudsButton } from '@/components/ui/fuds-button';
import {
    MEAL_WINDOWS,
    formatNaira,
    formatSlotLabel,
    getMealWindow,
    type MealType,
} from '@/constants/schedule';
import {
    BottomTabInset,
    FudsColors,
    FudsImages,
    FudsRadius,
    FudsShadow,
    Spacing,
} from '@/constants/theme';
import {
    scheduleApi,
    type ScheduleDayRead,
    type ScheduleWeekRead,
    type ScheduledMealRead,
} from '@/lib/api';

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = BottomTabInset + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0);
  const footerLift = 16;

  const [week, setWeek] = useState<ScheduleWeekRead | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [draftTimes, setDraftTimes] = useState<Partial<Record<MealType, string>>>({});

  const loadWeek = useCallback(async () => {
    try {
      setError(null);
      const data = await scheduleApi.getWeek();
      setWeek(data);
      setSelectedDate((prev) => {
        if (prev && data.days.some((d) => d.date === prev)) return prev;
        const today = data.days.find((d) => d.is_today) ?? data.days[0];
        return today?.date ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load 111 schedule');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        if (alive) await loadWeek();
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [loadWeek])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWeek();
    setRefreshing(false);
  }, [loadWeek]);

  const selectedDay: ScheduleDayRead | undefined = useMemo(
    () => week?.days.find((d) => d.date === selectedDate) ?? week?.days[0],
    [week, selectedDate]
  );

  const windows = week?.windows?.length ? week.windows : MEAL_WINDOWS;

  const mealsFor = useCallback(
    (mealType: MealType): ScheduledMealRead[] => {
      const raw = selectedDay?.meals?.[mealType] as
        | ScheduledMealRead[]
        | ScheduledMealRead
        | undefined;
      if (Array.isArray(raw)) return raw;
      if (raw) return [raw];
      return [];
    },
    [selectedDay]
  );

  const filledMeals = useMemo(() => {
    if (!selectedDay) return [];
    return MEAL_WINDOWS.flatMap((w) => mealsFor(w.meal_type)).filter(
      (m) => Boolean(m.product_id) && m.status !== 'confirmed'
    );
  }, [selectedDay, mealsFor]);

  const confirmedCount = useMemo(() => {
    if (!selectedDay) return 0;
    return MEAL_WINDOWS.flatMap((w) => mealsFor(w.meal_type)).filter(
      (m) => m.status === 'confirmed'
    ).length;
  }, [selectedDay, mealsFor]);

  const planTotal = filledMeals.reduce((sum, meal) => sum + (meal.subtotal ?? 0), 0);

  const setDraftTime = (mealType: MealType, slotTime: string) => {
    if (!selectedDay || selectedDay.is_past) return;
    setDraftTimes((prev) => ({ ...prev, [mealType]: slotTime }));
  };

  const changeQty = async (meal: ScheduledMealRead, delta: number) => {
    const next = meal.quantity + delta;
    if (next < 1) {
      setBusyKey(`qty-${meal.id}`);
      try {
        await scheduleApi.remove(meal.id);
        await loadWeek();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove meal');
      } finally {
        setBusyKey(null);
      }
      return;
    }
    setBusyKey(`qty-${meal.id}`);
    try {
      await scheduleApi.update(meal.id, { quantity: next });
      await loadWeek();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update quantity');
    } finally {
      setBusyKey(null);
    }
  };

  const addMeal = (mealType: MealType) => {
    if (!selectedDay) return;
    const slot = draftTimes[mealType];
    if (!slot) {
      setError(`Pick a ${mealType} time first`);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({
      pathname: '/(app)/schedule/pick-meal' as any,
      params: {
        meal_type: mealType,
        date: selectedDay.date,
        time: slot,
      },
    });
  };

  const handleCheckout = async () => {
    if (!selectedDay || filledMeals.length === 0) return;
    setCheckingOut(true);
    setError(null);
    try {
      const order = await scheduleApi.checkout({ delivery_date: selectedDay.date });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push({
        pathname: '/(app)/payment/[orderId]' as any,
        params: {
          orderId: String(order.id),
          total: String(order.total_price),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not checkout 111 plan');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading && !week) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={FudsColors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const footerVisible = filledMeals.length > 0;
  const bottomPad = (footerVisible ? 150 : 24) + tabClearance + (footerVisible ? footerLift : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroBlobA} />
          <View style={styles.heroBlobB} />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>111</Text>
          </View>
          <Text style={styles.heroTitle}>Plan am.{'\n'}We go deliver.</Text>
          <Text style={styles.heroSub}>
            Lock breakfast, lunch or dinner before the Lagos rush — as many plates as you like.
          </Text>
          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Ionicons name="sunny" size={14} color="#E85D04" />
              <Text style={styles.heroPillText}>8–11am</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="restaurant" size={14} color="#2A9D8F" />
              <Text style={styles.heroPillText}>1–4pm</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="moon" size={14} color="#5B4B8A" />
              <Text style={styles.heroPillText}>5–7pm</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStrip}
        >
          {(week?.days ?? []).map((day) => {
            const active = day.date === selectedDay?.date;
            return (
              <TouchableOpacity
                key={day.date}
                style={[
                  styles.dayChip,
                  active && styles.dayChipActive,
                  day.is_past && styles.dayChipPast,
                ]}
                onPress={() => !day.is_past && setSelectedDate(day.date)}
                disabled={day.is_past}
                activeOpacity={0.85}
              >
                <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{day.label}</Text>
                <Text style={[styles.dayNum, active && styles.dayNumActive]}>
                  {day.date.slice(-2)}
                </Text>
                {day.is_today ? (
                  <Text style={[styles.todayTag, active && styles.todayTagActive]}>Today</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.infoBanner}>
          <Ionicons name="calendar" size={18} color={FudsColors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              {selectedDay ? prettyDate(selectedDay.date) : 'Choose a day'}
            </Text>
            <Text style={styles.infoBody}>
              Breakfast 8–11am · Lunch 1–4pm · Dinner 5–7pm. Add as many dishes as you want in each window.
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.slotList}>
          {MEAL_WINDOWS.map((window) => {
            const mealType = window.meal_type;
            const items = mealsFor(mealType);
            const available = selectedDay?.available_slots[mealType] ?? window.slot_times;
            const selectedTime = draftTimes[mealType] ?? null;
            const occupied = new Set(items.map((item) => item.slot_time));
            const chips =
              selectedTime && !available.includes(selectedTime)
                ? [selectedTime, ...available]
                : available;
            const visual = getMealWindow(mealType);
            const apiWindow = windows.find((w) => w.meal_type === mealType);
            const canAdd = Boolean(selectedTime) && !selectedDay?.is_past && chips.length > 0;

            return (
              <View key={mealType} style={styles.mealCard}>
                <View style={styles.mealHead}>
                  <View style={[styles.mealIcon, { backgroundColor: visual.bg }]}>
                    <Ionicons name={visual.icon} size={20} color={visual.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealName}>{visual.label}</Text>
                    <Text style={styles.mealRange}>
                      {apiWindow?.range_label ?? visual.range_label}
                    </Text>
                  </View>
                  {items.length > 0 ? (
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{items.length}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.slotHint}>Delivery time</Text>
                <View style={styles.chipWrap}>
                  {chips.length === 0 ? (
                    <Text style={styles.closedText}>
                      {selectedDay?.is_today
                        ? `${visual.label} window is closed for today`
                        : 'No times left on this day'}
                    </Text>
                  ) : (
                    chips.map((slot) => {
                      const on = selectedTime === slot;
                      const used = occupied.has(slot);
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.timeChip,
                            used && styles.timeChipUsed,
                            on && styles.timeChipOn,
                          ]}
                          onPress={() => setDraftTime(mealType, slot)}
                          disabled={selectedDay?.is_past}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              used && styles.timeChipTextUsed,
                              on && styles.timeChipTextOn,
                            ]}
                          >
                            {formatSlotLabel(slot)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {items.map((meal) => {
                  const locked = meal.status === 'confirmed';
                  return (
                    <View key={meal.id} style={styles.productRow}>
                      <Image
                        source={{ uri: meal.product_image_url || FudsImages.jollof }}
                        style={styles.productImg}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {meal.product_name ?? 'Meal'}
                        </Text>
                        <Text style={styles.productVendor} numberOfLines={1}>
                          {meal.vendor_name ?? 'Vendor'} · {formatSlotLabel(meal.slot_time)}
                        </Text>
                        <Text style={styles.productPrice}>
                          {formatNaira(meal.subtotal ?? meal.product_price ?? 0)}
                        </Text>
                      </View>
                      {locked ? (
                        <View style={styles.lockedPill}>
                          <Text style={styles.lockedText}>Scheduled</Text>
                        </View>
                      ) : (
                        <View style={styles.qtyCol}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => changeQty(meal, -1)}
                            disabled={busyKey === `qty-${meal.id}`}
                          >
                            <Ionicons
                              name={meal.quantity <= 1 ? 'trash-outline' : 'remove'}
                              size={16}
                              color={FudsColors.foreground}
                            />
                          </TouchableOpacity>
                          <Text style={styles.qtyNum}>{meal.quantity}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => changeQty(meal, 1)}
                            disabled={busyKey === `qty-${meal.id}`}
                          >
                            <Ionicons name="add" size={16} color={FudsColors.foreground} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.addDash, !canAdd && styles.addDashDisabled]}
                  onPress={() => addMeal(mealType)}
                  disabled={!canAdd}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={canAdd ? FudsColors.primary : FudsColors.mutedForeground}
                  />
                  <Text style={[styles.addDashText, !canAdd && styles.addDashTextDisabled]}>
                    {!selectedTime
                      ? 'Pick a time first'
                      : items.length > 0
                        ? `Add another ${visual.label.toLowerCase()}`
                        : `Add ${visual.label.toLowerCase()}`}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {confirmedCount > 0 ? (
          <Text style={styles.confirmedNote}>
            {confirmedCount} meal{confirmedCount === 1 ? '' : 's'} already scheduled for this day.
          </Text>
        ) : null}
      </ScrollView>

      {footerVisible ? (
        <View
          style={[styles.footer, { bottom: footerLift, paddingBottom: tabClearance }]}
        >
          <View style={styles.footerMeta}>
            <Text style={styles.footerCount}>
              {filledMeals.length} meal{filledMeals.length === 1 ? '' : 's'} · {prettyDate(selectedDay!.date)}
            </Text>
            <Text style={styles.footerTotal}>{formatNaira(planTotal)}</Text>
          </View>
          <FudsButton
            label={`Schedule & pay ${filledMeals.length} meal${filledMeals.length === 1 ? '' : 's'}`}
            loading={checkingOut}
            onPress={handleCheckout}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FudsColors.background },
  centered: {
    flex: 1,
    backgroundColor: FudsColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    backgroundColor: FudsColors.primary,
    borderRadius: 28,
    padding: Spacing.four,
    overflow: 'hidden',
    ...FudsShadow.md,
  },
  heroBlobA: {
    position: 'absolute',
    top: -28,
    right: -18,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBlobB: {
    position: 'absolute',
    bottom: -36,
    left: -24,
    width: 130,
    height: 90,
    borderRadius: 40,
    backgroundColor: 'rgba(8,80,65,0.22)',
    transform: [{ rotate: '-12deg' }],
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: FudsColors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: FudsColors.foreground,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19,
    maxWidth: '92%',
  },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroPillText: { fontSize: 11, fontWeight: '800', color: FudsColors.foreground },
  weekStrip: { paddingHorizontal: Spacing.three, gap: 8, paddingBottom: Spacing.three },
  dayChip: {
    width: 62,
    paddingVertical: 10,
    borderRadius: FudsRadius.lg,
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: FudsColors.primary,
    borderColor: FudsColors.primary,
  },
  dayChipPast: { opacity: 0.4 },
  dayLabel: { fontSize: 11, fontWeight: '700', color: FudsColors.mutedForeground },
  dayLabelActive: { color: FudsColors.primaryForeground },
  dayNum: { fontSize: 16, fontWeight: '800', color: FudsColors.foreground, marginTop: 2 },
  dayNumActive: { color: FudsColors.primaryForeground },
  todayTag: { fontSize: 9, fontWeight: '800', color: FudsColors.primary, marginTop: 2 },
  todayTagActive: { color: FudsColors.secondary },
  infoBanner: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: FudsColors.secondary,
    borderRadius: FudsRadius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: FudsColors.foreground },
  infoBody: { fontSize: 12, color: FudsColors.secondaryForeground, marginTop: 2, lineHeight: 17 },
  errorBox: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: '#FEE2E2',
    borderRadius: FudsRadius.md,
    padding: 12,
  },
  errorText: { color: FudsColors.destructive, fontSize: 13, fontWeight: '600' },
  slotList: { paddingHorizontal: Spacing.three, gap: 14 },
  mealCard: {
    backgroundColor: FudsColors.card,
    borderRadius: FudsRadius.xl,
    borderWidth: 1,
    borderColor: FudsColors.border,
    padding: Spacing.three,
    ...FudsShadow.sm,
  },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: { fontSize: 16, fontWeight: '800', color: FudsColors.foreground },
  mealRange: { fontSize: 12, color: FudsColors.mutedForeground, fontWeight: '600', marginTop: 1 },
  countPill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: FudsColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: { fontSize: 12, fontWeight: '800', color: FudsColors.primary },
  lockedPill: {
    backgroundColor: FudsColors.openBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lockedText: { fontSize: 11, fontWeight: '800', color: FudsColors.openText },
  slotHint: {
    fontSize: 11,
    fontWeight: '800',
    color: FudsColors.mutedForeground,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: FudsColors.background,
    borderWidth: 1,
    borderColor: FudsColors.border,
  },
  timeChipUsed: { borderColor: FudsColors.primary },
  timeChipOn: { backgroundColor: FudsColors.primary, borderColor: FudsColors.primary },
  timeChipText: { fontSize: 12, fontWeight: '700', color: FudsColors.foreground },
  timeChipTextUsed: { color: FudsColors.primary },
  timeChipTextOn: { color: FudsColors.primaryForeground },
  closedText: { fontSize: 12, color: FudsColors.mutedForeground, fontWeight: '600' },
  productRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: FudsColors.background,
    borderRadius: FudsRadius.md,
    padding: 10,
    alignItems: 'center',
  },
  productImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: FudsColors.muted },
  productName: { fontSize: 14, fontWeight: '800', color: FudsColors.foreground },
  productVendor: { fontSize: 12, color: FudsColors.mutedForeground, marginTop: 2, fontWeight: '600' },
  productPrice: { fontSize: 13, fontWeight: '800', color: FudsColors.primary, marginTop: 4 },
  qtyCol: { alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: FudsColors.card,
    borderWidth: 1,
    borderColor: FudsColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: { fontSize: 13, fontWeight: '800', color: FudsColors.foreground },
  addDash: {
    marginTop: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: FudsColors.primary,
    borderRadius: FudsRadius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addDashDisabled: { borderColor: FudsColors.border },
  addDashText: { fontSize: 13, fontWeight: '700', color: FudsColors.primary },
  addDashTextDisabled: { color: FudsColors.mutedForeground },
  confirmedNote: {
    textAlign: 'center',
    marginTop: Spacing.three,
    fontSize: 12,
    color: FudsColors.mutedForeground,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: FudsColors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FudsColors.border,
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    ...FudsShadow.md,
  },
  footerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerCount: { fontSize: 13, fontWeight: '700', color: FudsColors.mutedForeground },
  footerTotal: { fontSize: 16, fontWeight: '800', color: FudsColors.foreground },
});
