import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { CommunityCard } from '@/components/community-card';
import { PostCard } from '@/components/post-card';
import { ScreenHeader } from '@/components/screen-header';
import { Segmented } from '@/components/segmented';
import { TabList } from '@/components/tab-list';
import { Spacing } from '@/constants/theme';

type Tab = 'recent' | 'communities';
const tabs: { value: Tab; label: string }[] = [
  { value: 'recent', label: 'Récent' },
  { value: 'communities', label: 'Communautés' },
];

const FEED_PAGE = 10;
const COMMUNITY_PAGE = 15;

export default function CommunitiesScreen() {
  const [tab, setTab] = useState<Tab>('recent');
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const go = (href: '/posts/new' | '/communities/new') => router.push(isAuthenticated ? href : '/account');

  const header = (
    <ScreenHeader
      title="Communautés"
      subtitle="Échangez avec les Malagasy d’Allemagne"
      actions={
        <IconButton icon="create-outline" tone="primary" label="Nouvelle publication" onPress={() => go('/posts/new')} />
      }>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Segmented options={tabs} value={tab} onChange={setTab} />
        </View>
        {tab === 'communities' ? (
          <Button label="Créer" icon="add" variant="outline" onPress={() => go('/communities/new')} />
        ) : null}
      </View>
    </ScreenHeader>
  );

  return tab === 'recent' ? (
    <RecentFeed header={header} onCreate={() => go('/posts/new')} />
  ) : (
    <CommunityList header={header} onCreate={() => go('/communities/new')} />
  );
}

/** "Récent": every visible post, newest first, loaded by offset like the web feed. */
function RecentFeed({ header, onCreate }: { header: React.ReactElement; onCreate: () => void }) {
  const [count, setCount] = useState(FEED_PAGE);
  const feed = useQuery(api.posts.queries.getSortedPosts, { order: 'desc', offset: 0, numItems: count });

  return (
    <TabList
      data={feed?.posts ?? []}
      renderItem={(post) => <PostCard post={post} />}
      header={header}
      loading={feed === undefined}
      onEndReached={() => {
        if (feed?.hasMore && feed.posts.length >= count) setCount((n) => n + FEED_PAGE);
      }}
      empty={{
        icon: 'chatbubbles-outline',
        title: 'Aucune publication pour le moment',
        description: 'Lancez la discussion avec la communauté.',
        actionLabel: 'Nouvelle publication',
        onAction: onCreate,
      }}
    />
  );
}

function CommunityList({ header, onCreate }: { header: React.ReactElement; onCreate: () => void }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.queries.getCommunitiesPreview,
    {},
    { initialNumItems: COMMUNITY_PAGE },
  );

  return (
    <TabList
      data={results}
      renderItem={(community) => <CommunityCard community={community} />}
      header={header}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
