import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from './empty-state';
import type { IconName } from './icon';
import { ThemedView } from './themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export type EmptyConfig = {
  title: string;
  description?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
};

/** Full-height list used by each tab: safe area, header, empty state and paging. */
export function TabList<Item extends { _id: string }>({
  data,
  renderItem,
  header,
  loading,
  loadingMore,
  onEndReached,
  empty,
}: {
  data: Item[];
  renderItem: (item: Item) => ReactElement | null;
  header: ReactElement;
  loading: boolean;
  loadingMore?: boolean;
  onEndReached?: () => void;
  empty: EmptyConfig;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => renderItem(item)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          ListEmptyComponent={
            loading ? <ActivityIndicator style={styles.loader} /> : <EmptyState {...empty} />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loader} /> : undefined}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  loader: { marginVertical: Spacing.four },
});
