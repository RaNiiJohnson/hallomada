/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Hallomada palette, converted from the web theme (apps/web/app/globals.css).
// Green is the one accent color: buttons, focus and brand. Neutral selections
// (chips, counters) use `ink`, and the legacy info/violet accents point to
// slate so screens stay calm. Warning and destructive are for real states only.
export const Colors = {
  light: {
    text: '#374151',
    textSecondary: '#6b7280',
    background: '#f0f8ff',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e0f2fe',
    secondary: '#e0f2fe',
    card: '#ffffff',
    // List cards: web `bg-card dark:bg-card/35`.
    cardSubtle: '#ffffff',
    muted: '#f3f4f6',
    border: '#e5e7eb',
    primary: '#22c55e',
    primaryStrong: '#16a34a',
    primaryForeground: '#ffffff',
    primarySoft: '#d1fae5',
    primaryText: '#15803d',
    brand: '#22c55e',
    brandForeground: '#ffffff',
    ink: '#374151',
    inkForeground: '#ffffff',
    info: '#4b5563',
    infoSoft: '#f3f4f6',
    warning: '#b45309',
    warningSoft: '#fef3c7',
    destructive: '#ef4444',
    destructiveSoft: '#fee2e2',
    violet: '#4b5563',
    violetSoft: '#f3f4f6',
    shadow: '#64748b',
  },
  dark: {
    text: '#d1d5db',
    textSecondary: '#6b7280',
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#334155',
    secondary: '#2d3748',
    card: '#1e293b',
    cardSubtle: '#141d30',
    muted: '#19212e',
    border: '#2d4163',
    primary: '#34d399',
    primaryStrong: '#10b981',
    primaryForeground: '#0f172a',
    primarySoft: '#064e3b',
    primaryText: '#6ee7b7',
    brand: '#34d399',
    brandForeground: '#0f172a',
    ink: '#d1d5db',
    inkForeground: '#0f172a',
    info: '#cbd5e1',
    infoSoft: '#334155',
    warning: '#fbbf24',
    warningSoft: '#451a03',
    destructive: '#f87171',
    destructiveSoft: '#450a0a',
    violet: '#cbd5e1',
    violetSoft: '#334155',
    shadow: '#000000',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// lg and xl match the web cards (--radius: 1.25rem → 20px, rounded-xl → 24px).
export const Radius = { sm: 10, md: 14, lg: 20, xl: 24, full: 999 } as const;
