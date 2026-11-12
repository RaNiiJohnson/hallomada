import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery, useQuery } from 'convex/react';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PostCard } from '@/components/post-card';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type View_ = 'recent' | 'communities';
const views: { value: View_; label: string }[] = [
  { value: 'recent', label: 'Récent' },
  { value: 'communities', label: 'Communautés' },
];

const FEED_PAGE = 10;
const COMMUNITY_PAGE = 15;

export default function CommunitiesScreen() {
  const [view, setView] = useState<View_>('recent');
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const header = (
    <View style={styles.header}>
      <ThemedText type="title">Communautés</ThemedText>
      <Segmented options={views} value={view} onChange={setView} />
      <Button
        label="Nouvelle publication"
        primary
        onPress={() => router.push(isAuthenticated ? '/posts/new' : '/account')}
      />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {view === 'recent' ? <RecentFeed header={header} /> : <CommunityList header={header} />}
      </SafeAreaView>
    </ThemedView>
  );
}

/** "Récent": every visible post, newest first, loaded by offset like the web feed. */
function RecentFeed({ header }: { header: React.ReactElement }) {
  const [count, setCount] = useState(FEED_PAGE);
  const feed = useQuery(api.posts.queries.getSortedPosts, {
    order: 'desc',
    offset: 0,
    numItems: count,
  });

  return (
    <FlatList
      data={feed?.posts ?? []}
      keyExtractor={(post) => post._id}
      renderItem={({ item }) => <PostCard post={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      ListEmptyComponent={
        feed === undefined ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <ThemedText themeColor="textSecondary">Aucune publication pour le moment.</ThemedText>
        )
      }
      onEndReached={() => {
        if (feed?.hasMore && feed.posts.length >= count) setCount((n) => n + FEED_PAGE);
      }}
      onEndReachedThreshold={0.5}
    />
  );
}

function CommunityList({ header }: { header: React.ReactElement }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.queries.getCommunitiesPreview,
    {},
    { initialNumItems: COMMUNITY_PAGE },
  );

  return (
    <FlatList
      data={results}
      keyExtractor={(community) => community._id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <Link
          href={{ pathname: '/communities/[community]', params: { community: item.slug } }}
          asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {item.description}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.membersCount} membre(s) · {item.postsCount} publication(s)
                {item.privacy === 'private' ? ' · Privée' : ''}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Link>
      )}
      ListEmptyComponent={
        status === 'LoadingFirstPage' ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <ThemedText themeColor="textSecondary">Aucune communauté pour le moment.</ThemedText>
        )
      }
      ListFooterComponent={
        status === 'LoadingMore' ? <ActivityIndicator style={styles.loader} /> : undefined
      }
      onEndReached={() => {
        if (status === 'CanLoadMore') loadMore(COMMUNITY_PAGE);
      }}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  list: { paddingHorizontal: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, gap: Spacing.two },
  header: { marginTop: Spacing.three, marginBottom: Spacing.two, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  loader: { marginVertical: Spacing.four },
  pressed: { opacity: 0.7 },
});
