import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** Full-width paging photo gallery with a "n / total" counter. */
export function Gallery({ urls }: { urls: (string | null | undefined)[] }) {
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MaxContentWidth);
  const [index, setIndex] = useState(0);
  const sources = urls.filter((url): url is string => Boolean(url));
  if (sources.length === 0) return null;

  return (
    <View style={[styles.gallery, { width: pageWidth }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth))
        }>
        {sources.map((url, i) => (
          <Image
            key={`${url}-${i}`}
            source={url}
            style={{ width: pageWidth, height: pageWidth * 0.7 }}
            contentFit="cover"
            transition={150}
            accessibilityLabel={`Photo ${i + 1} sur ${sources.length}`}
          />
        ))}
      </ScrollView>
      {sources.length > 1 ? (
        <ThemedView type="background" style={styles.counter}>
          <ThemedText type="small">
            {index + 1} / {sources.length}
          </ThemedText>
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { alignSelf: 'center' },
  counter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
