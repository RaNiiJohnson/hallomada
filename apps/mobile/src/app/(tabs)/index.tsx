import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { JobCard } from '@/components/job-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

const PAGE_SIZE = 20;

export default function JobsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
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
            <View style={styles.header}>
              <ThemedText type="title">Jobs</ThemedText>
              <Button
                label="Publier une offre"
                primary
                onPress={() => router.push(isAuthenticated ? '/jobs/new' : '/account')}
              />
            </View>
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
  header: {
    marginVertical: Spacing.three,
    gap: Spacing.three,
  },
  loader: {
    marginVertical: Spacing.four,
  },
});
