import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from './icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Icon name="search" size={18} themeColor="textSecondary" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        style={[styles.input, { color: theme.text }]}
      />
      {value ? (
        <Pressable accessibilityLabel="Effacer" hitSlop={8} onPress={() => onChangeText('')}>
          <Icon name="close-circle" size={18} themeColor="textSecondary" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: Spacing.two },
});
