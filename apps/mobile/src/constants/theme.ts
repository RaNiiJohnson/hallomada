/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Hallomada palette, converted from the web theme (apps/web/app/globals.css).
export const Colors = {
  light: {
    text: '#1f2937',
    textSecondary: '#6b7280',
    background: '#f0f8ff',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e0f2fe',
    card: '#ffffff',
    muted: '#f3f4f6',
    border: '#e5e7eb',
    primary: '#22c55e',
    primaryStrong: '#16a34a',
    primaryForeground: '#ffffff',
    primarySoft: '#dcfce7',
    primaryText: '#15803d',
    info: '#0284c7',
    infoSoft: '#e0f2fe',
    warning: '#b45309',
    warningSoft: '#fef3c7',
    destructive: '#ef4444',
    destructiveSoft: '#fee2e2',
    violet: '#7c3aed',
    violetSoft: '#ede9fe',
    shadow: '#64748b',
  },
  dark: {
    text: '#e5e7eb',
    textSecondary: '#94a3b8',
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#334155',
    card: '#1e293b',
    muted: '#19212e',
    border: '#334155',
    primary: '#34d399',
    primaryStrong: '#10b981',
    primaryForeground: '#0f172a',
    primarySoft: '#064e3b',
    primaryText: '#6ee7b7',
    info: '#38bdf8',
    infoSoft: '#0c4a6e',
    warning: '#fbbf24',
    warningSoft: '#451a03',
    destructive: '#f87171',
    destructiveSoft: '#450a0a',
    violet: '#a78bfa',
    violetSoft: '#2e1065',
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

export const Radius = { sm: 8, md: 12, lg: 16, full: 999 } as const;
