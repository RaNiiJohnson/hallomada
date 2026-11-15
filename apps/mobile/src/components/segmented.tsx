import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Chip({
  label,
  selected,
  check,
  onPress,
}: {
  label: string;
  selected: boolean;
  check?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={check ? 'checkbox' : 'button'}
      accessibilityState={check ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.card,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      {check && selected ? <Icon name="checkmark" size={14} color={theme.primaryForeground} /> : null}
      <ThemedText
        type="small"
        style={{ color: selected ? theme.primaryForeground : theme.text, fontWeight: selected ? 600 : 500 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

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
  const chips = options.map((option) => (
    <Chip
      key={option.label}
      label={option.label}
      selected={option.value === value}
      onPress={() => onChange(option.value)}
    />
  ));
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

/** Chips where any number of values can be toggled on. */
export function MultiSegmented<Value extends string>({
  options,
  values,
  onChange,
}: {
  options: { value: Value; label: string }[];
  values: Value[];
  onChange: (values: Value[]) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <Chip
            key={option.value}
            label={option.label}
            selected={selected}
            check
            onPress={() =>
              onChange(selected ? values.filter((value) => value !== option.value) : [...values, option.value])
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  scroll: { gap: Spacing.two, paddingRight: Spacing.three },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
});
