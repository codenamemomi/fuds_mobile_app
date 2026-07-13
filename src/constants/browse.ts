/**
 * Home category grid config — maps backend /browse/categories icons → Ionicons + colors.
 * Layout inspired by Glovo / Chowdeck style category hubs.
 */

import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { FudsColors } from '@/constants/theme';
import type { BrowseGroupKey } from '@/lib/api';

type IonName = ComponentProps<typeof Ionicons>['name'];

export type CategoryVisual = {
  icon: IonName;
  tint: string;
  bg: string;
};

export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  food: {
    icon: 'fast-food',
    tint: '#E85D04',
    bg: '#FFF3E6',
  },
  grocery: {
    icon: 'cart',
    tint: '#2A9D8F',
    bg: '#E8F8F5',
  },
  shops: {
    icon: 'bag-handle',
    tint: '#9B5DE5',
    bg: '#F5EDFF',
  },
  pharmacy: {
    icon: 'medkit',
    tint: '#E63946',
    bg: '#FFE8EA',
  },
  packages: {
    icon: 'bicycle',
    tint: '#457B9D',
    bg: '#E8F1F8',
  },
};

export const FALLBACK_CATEGORIES: {
  key: BrowseGroupKey;
  label: string;
  subtitle: string;
  icon: string;
  vendor_categories: string[];
  vendor_count: number;
}[] = [
  {
    key: 'food',
    label: 'Food',
    subtitle: 'Hot meals & bakeries',
    icon: 'food',
    vendor_categories: ['restaurant', 'bakery'],
    vendor_count: 0,
  },
  {
    key: 'grocery',
    label: 'Grocery',
    subtitle: 'Fresh & pantry',
    icon: 'grocery',
    vendor_categories: ['grocery_store', 'supermarket', 'local_market'],
    vendor_count: 0,
  },
  {
    key: 'shops',
    label: 'Shops',
    subtitle: 'Retail & essentials',
    icon: 'shops',
    vendor_categories: ['shop'],
    vendor_count: 0,
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    subtitle: 'Health & beauty',
    icon: 'pharmacy',
    vendor_categories: ['pharmacy'],
    vendor_count: 0,
  },
  {
    key: 'packages',
    label: 'Packages',
    subtitle: 'Send anything',
    icon: 'packages',
    vendor_categories: ['package_delivery'],
    vendor_count: 0,
  },
];

export function getCategoryVisual(iconOrKey: string): CategoryVisual {
  return (
    CATEGORY_VISUALS[iconOrKey] ?? {
      icon: 'grid' as IonName,
      tint: FudsColors.primary,
      bg: 'rgba(29,158,117,0.12)',
    }
  );
}
