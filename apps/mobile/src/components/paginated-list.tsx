import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type Status = 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted';

/** FlatList wired to a Convex usePaginatedQuery result. */
export function PaginatedList<Item extends { _id: string }>({
  results,
  status,
  loadMore,
  pageSize,
  renderItem,
  empty,
  header,
  inverted,
}: {
  results: Item[];
  status: Status;
  loadMore: (count: number) => void;
  pageSize: number;
  renderItem: (item: Item) => ReactElement | null;
  empty: string;
  header?: ReactElement;
  inverted?: boolean;
}) {
  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={results}
        inverted={inverted}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => renderItem(item)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListEmptyComponent={
          status === 'LoadingFirstPage' ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <ThemedText themeColor="textSecondary">{empty}</ThemedText>
          )
        }
        ListFooterComponent={
          status === 'LoadingMore' ? <ActivityIndicator style={styles.loader} /> : undefined
        }
        onEndReached={() => {
          if (status === 'CanLoadMore') loadMore(pageSize);
        }}
        onEndReachedThreshold={0.5}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  loader: { marginVertical: Spacing.four },
});
