/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// "Ink & paper" palette: monochrome first, with the Hallomada green kept as a
// single brand spark (`brand`) for the one highest-intent action on a screen.
// Legacy accent names (primarySoft, info, violet…) point to neutrals so screens
// stay calm; warning and destructive keep real colors for actual states only.
export const Colors = {
  light: {
    text: '#0a0a0a',
    textSecondary: '#737373',
    background: '#ffffff',
    backgroundElement: '#f5f5f5',
    backgroundSelected: '#ebebeb',
    card: '#ffffff',
    muted: '#f5f5f5',
    border: '#e5e5e5',
    primary: '#0a0a0a',
    primaryStrong: '#262626',
    primaryForeground: '#fafafa',
    primarySoft: '#f5f5f5',
    primaryText: '#0a0a0a',
    brand: '#16a34a',
    brandForeground: '#ffffff',
    info: '#525252',
    infoSoft: '#f5f5f5',
    warning: '#b45309',
    warningSoft: '#fef3c7',
    destructive: '#dc2626',
    destructiveSoft: '#fee2e2',
    violet: '#525252',
    violetSoft: '#f5f5f5',
    shadow: '#000000',
  },
  dark: {
    text: '#fafafa',
    textSecondary: '#a3a3a3',
    background: '#0a0a0a',
    backgroundElement: '#171717',
    backgroundSelected: '#262626',
    card: '#171717',
    muted: '#262626',
    border: '#262626',
    primary: '#fafafa',
    primaryStrong: '#e5e5e5',
    primaryForeground: '#0a0a0a',
    primarySoft: '#262626',
    primaryText: '#fafafa',
    brand: '#34d399',
    brandForeground: '#0a0a0a',
    info: '#d4d4d4',
    infoSoft: '#262626',
    warning: '#fbbf24',
    warningSoft: '#422006',
    destructive: '#f87171',
    destructiveSoft: '#450a0a',
    violet: '#d4d4d4',
    violetSoft: '#262626',
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
