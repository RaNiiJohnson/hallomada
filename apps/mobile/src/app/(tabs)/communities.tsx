import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CommunityCard } from '@/components/community-card';
import { CommunityStrip } from '@/components/community-strip';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { ScreenHeader } from '@/components/screen-header';
import { Segmented } from '@/components/segmented';
import { TabList } from '@/components/tab-list';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Sort = 'recent' | 'top' | 'shuffle' | 'oldest' | 'bookmarked';

const FEED_PAGE = 10;
const COMMUNITY_PAGE = 15;

export default function CommunitiesScreen() {
  const [explore, setExplore] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const go = (href: '/posts/new' | '/communities/new') => router.push(isAuthenticated ? href : '/account');

  return explore ? (
    <CommunityList onBack={() => setExplore(false)} onCreate={() => go('/communities/new')} />
  ) : (
    <Feed onExplore={() => setExplore(true)} onCreate={() => go('/posts/new')} />
  );
}

/** Web-style feed: community strip, "Publications" heading with a sort, then flat posts. */
function Feed({ onExplore, onCreate }: { onExplore: () => void; onCreate: () => void }) {
  const { isAuthenticated } = useConvexAuth();
  const [sort, setSort] = useState<Sort>('recent');
  const [count, setCount] = useState(FEED_PAGE);
  // One seed per screen visit keeps the shuffled order stable while paging.
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  const page = { offset: 0, numItems: count };

  const sorted = useQuery(
    api.posts.queries.getSortedPosts,
    sort === 'recent' || sort === 'oldest' ? { order: sort === 'recent' ? 'desc' : 'asc', ...page } : 'skip',
  );
  const top = useQuery(api.posts.queries.getSortedByLikes, sort === 'top' ? page : 'skip');
  const shuffled = useQuery(api.posts.queries.getShuffledPosts, sort === 'shuffle' ? { seed, ...page } : 'skip');
  const bookmarked = useQuery(api.posts.queries.getBookmarkedPosts, sort === 'bookmarked' ? page : 'skip');
  const feed = { recent: sorted, oldest: sorted, top, shuffle: shuffled, bookmarked }[sort];

  const sorts: { value: Sort; label: string }[] = [
    { value: 'recent', label: 'Récentes' },
    { value: 'top', label: 'Populaires' },
    { value: 'shuffle', label: 'Aléatoire' },
    { value: 'oldest', label: 'Anciennes' },
    ...(isAuthenticated ? [{ value: 'bookmarked' as const, label: 'Favoris' }] : []),
  ];

  const header = (
    <ScreenHeader
      title="Communautés"
      subtitle="Échangez et entraidez-vous entre Malagasy d’Allemagne"
      actions={<Button label="Publier" icon="create-outline" primary onPress={onCreate} />}>
      <CommunityStrip onExplore={onExplore} />
      <View style={styles.feedHeader}>
        <ThemedText style={styles.feedTitle}>Publications</ThemedText>
        <Segmented
          scroll
          options={sorts}
          value={sort}
          onChange={(next) => {
            setSort(next);
            setCount(FEED_PAGE);
          }}
        />
      </View>
    </ScreenHeader>
  );

  return (
    <TabList
      flat
      data={feed?.posts ?? []}
      renderItem={(post) => <PostCard post={post} />}
      header={header}
      loading={feed === undefined}
      onEndReached={() => {
        if (feed?.hasMore && feed.posts.length >= count) setCount((n) => n + FEED_PAGE);
      }}
      empty={
        sort === 'bookmarked'
          ? {
              icon: 'bookmark-outline',
              title: 'Aucun favori',
              description: 'Touchez le signet d’une publication pour la retrouver ici.',
            }
          : {
              icon: 'chatbubbles-outline',
              title: 'Aucune publication pour le moment',
              description: 'Lancez la discussion avec la communauté.',
              actionLabel: 'Nouvelle publication',
              onAction: onCreate,
            }
      }
    />
  );
}

/** Every community, reached from "Explorer" at the end of the strip. */
function CommunityList({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) {
  const theme = useTheme();
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.queries.getCommunitiesPreview,
    {},
    { initialNumItems: COMMUNITY_PAGE },
  );

  return (
    <TabList
      data={results}
      renderItem={(community) => <CommunityCard community={community} />}
      header={
        <ScreenHeader
          title="Toutes les communautés"
          actions={<Button label="Créer" icon="add" primary onPress={onCreate} />}>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
            <Icon name="arrow-back" size={16} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: 600 }}>
              Retour aux publications
            </ThemedText>
          </Pressable>
        </ScreenHeader>
      }
      loading={status === 'LoadingFirstPage'}
      loadingMore={status === 'LoadingMore'}
      onEndReached={() => status === 'CanLoadMore' && loadMore(COMMUNITY_PAGE)}
      empty={{
        icon: 'people-outline',
        title: 'Aucune communauté pour le moment',
        description: 'Créez une communauté pour votre ville ou votre passion.',
        actionLabel: 'Créer une communauté',
        onAction: onCreate,
      }}
    />
  );
}

const styles = StyleSheet.create({
  feedHeader: { gap: Spacing.two, marginTop: Spacing.two },
  feedTitle: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  back: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-start' },
});
