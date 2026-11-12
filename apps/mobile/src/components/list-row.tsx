import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';

/** Tappable card row used by the personal-space lists. */
export function ListRow({
  title,
  subtitle,
  meta,
  highlighted,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  highlighted?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={highlighted ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
        <View style={styles.text}>
          <ThemedText type="smallBold">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
          {meta ? (
            <ThemedText type="small" themeColor="textSecondary">
              {meta}
            </ThemedText>
          ) : null}
        </View>
        {highlighted ? <View style={styles.dot} /> : null}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  text: { flex: 1, gap: Spacing.half },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3C87F7' },
  pressed: { opacity: 0.7 },
});
