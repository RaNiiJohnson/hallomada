import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Round picture, or the first letter of the name on a tinted disc. */
export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string | null; size?: number }) {
  const theme = useTheme();
  const dimensions = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={uri} style={[dimensions, { backgroundColor: theme.muted }]} contentFit="cover" />;
  }
  return (
    <View style={[styles.fallback, dimensions, { backgroundColor: theme.primarySoft }]}>
      <ThemedText style={{ color: theme.primaryText, fontSize: size * 0.42, lineHeight: size * 0.5, fontWeight: 700 }}>
        {(name?.trim()[0] ?? '?').toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
