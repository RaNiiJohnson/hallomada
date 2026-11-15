import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Flat rounded surface with a hairline border. `overlay` (e.g. a bookmark
 * toggle) sits on top in the top-right corner, outside the pressable area, so
 * no button ends up nested in another.
 */
export function Card({
  children,
  onPress,
  style,
  padded = true,
  overlay,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  overlay?: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const surface = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style];
  const corner = overlay ? <View style={[styles.overlay, !padded && styles.overlayTight]}>{overlay}</View> : null;
  if (!onPress) {
    return (
      <View style={[surface, padded && styles.padded]}>
        {children}
        {corner}
      </View>
    );
  }
  return (
    <View style={surface}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.fill, padded && styles.padded, pressed && styles.pressed]}>
        {children}
      </Pressable>
      {corner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  fill: { flexGrow: 1 },
  padded: { padding: Spacing.three, gap: Spacing.two },
  pressed: { opacity: 0.8 },
  overlay: { position: 'absolute', top: Spacing.two + Spacing.one, right: Spacing.two + Spacing.one },
  overlayTight: { top: Spacing.two, right: Spacing.two },
});
