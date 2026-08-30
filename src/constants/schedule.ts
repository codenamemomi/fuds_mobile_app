/**
 * 111 meal windows (Africa/Lagos).
 * Breakfast 8:00–11:00, lunch 13:00–16:00, dinner 17:00–19:00.
 */

import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type MealWindow = {
  meal_type: MealType;
  label: string;
  start: string;
  end: string;
  range_label: string;
  slot_times: string[];
  icon: ComponentProps<typeof Ionicons>['name'];
  tint: string;
  bg: string;
};

function halfHourSlots(startH: number, startM: number, endH: number, endM: number): string[] {
  const slots: string[] = [];
  let minutes = startH * 60 + startM;
  const last = endH * 60 + endM;
  while (minutes <= last) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    minutes += 30;
  }
  return slots;
}

export const MEAL_WINDOWS: MealWindow[] = [
  {
    meal_type: 'breakfast',
    label: 'Breakfast',
    start: '08:00',
    end: '11:00',
    range_label: '8:00 AM – 11:00 AM',
    slot_times: halfHourSlots(8, 0, 11, 0),
    icon: 'sunny',
    tint: '#E85D04',
    bg: '#FFF3E6',
  },
  {
    meal_type: 'lunch',
    label: 'Lunch',
    start: '13:00',
    end: '16:00',
    range_label: '1:00 PM – 4:00 PM',
    slot_times: halfHourSlots(13, 0, 16, 0),
    icon: 'restaurant',
    tint: '#2A9D8F',
    bg: '#E8F8F5',
  },
  {
    meal_type: 'dinner',
    label: 'Dinner',
    start: '17:00',
    end: '19:00',
    range_label: '5:00 PM – 7:00 PM',
    slot_times: halfHourSlots(17, 0, 19, 0),
    icon: 'moon',
    tint: '#5B4B8A',
    bg: '#F3EEFF',
  },
];

export const WEEKDAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function formatSlotLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function getMealWindow(mealType: MealType): MealWindow {
  return MEAL_WINDOWS.find((w) => w.meal_type === mealType) ?? MEAL_WINDOWS[0];
}
