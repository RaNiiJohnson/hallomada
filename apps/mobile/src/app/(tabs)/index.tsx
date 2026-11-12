import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobCard } from '@/components/job-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

const PAGE_SIZE = 20;

export default function JobsScreen() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.queries.getJobs,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={results}
          keyExtractor={(job) => job._id}
          renderItem={({ item }) => <JobCard job={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ThemedText type="title" style={styles.title}>
              Jobs
            </ThemedText>
          }
          ListEmptyComponent={
            status === 'LoadingFirstPage' ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              <ThemedText themeColor="textSecondary">Aucune offre pour le moment.</ThemedText>
            )
          }
          ListFooterComponent={
            status === 'LoadingMore' ? <ActivityIndicator style={styles.loader} /> : undefined
          }
          onEndReached={() => {
            if (status === 'CanLoadMore') loadMore(PAGE_SIZE);
          }}
          onEndReachedThreshold={0.5}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  title: {
    marginVertical: Spacing.three,
  },
  loader: {
    marginVertical: Spacing.four,
  },
});
