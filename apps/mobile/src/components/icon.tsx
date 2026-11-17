import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Ionicons glyph tinted with a theme color. */
export function Icon({
  name,
  size = 20,
  color,
  themeColor = 'text',
}: {
  name: IconName;
  size?: number;
  color?: string;
  themeColor?: ThemeColor;
}) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme[themeColor]} />;
}
