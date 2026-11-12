import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Row of filter chips; one value is selected. `scroll` keeps them on one line. */
export function Segmented<Value extends string | undefined>({
  options,
  value,
  onChange,
  scroll,
}: {
  options: { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: selected ? theme.primary : theme.card,
            borderColor: selected ? theme.primary : theme.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}>
        <ThemedText
          type="small"
          style={{ color: selected ? theme.primaryForeground : theme.text, fontWeight: selected ? 700 : 500 }}>
          {option.label}
        </ThemedText>
      </Pressable>
    );
  });
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={styles.row}>{chips}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  scroll: { gap: Spacing.two, paddingRight: Spacing.three },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
