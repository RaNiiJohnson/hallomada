import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { PaginatedList } from '@/components/paginated-list';
import { Segmented } from '@/components/segmented';
import { Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/time';

const PAGE_SIZE = 20;
type Kind = 'communities' | 'posts';
const kinds: { value: Kind; label: string }[] = [
  { value: 'communities', label: 'Communautés' },
  { value: 'posts', label: 'Publications' },
];

const roleLabels: Record<string, string> = { admin: 'Admin', moderator: 'Modérateur' };

export default function MyCommunitiesScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('communities');
  const header = (
    <View style={styles.header}>
      <Segmented options={kinds} value={kind} onChange={setKind} />
      <Button
        label={kind === 'communities' ? 'Créer une communauté' : 'Nouvelle publication'}
        icon="add"
        primary
        onPress={() => router.push(kind === 'communities' ? '/communities/new' : '/posts/new')}
      />
    </View>
  );
  return kind === 'communities' ? <Communities header={header} /> : <Posts header={header} />;
}

function Communities({ header }: { header: React.ReactElement }) {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(api.me.queries.getMyCommunities, {}, { initialNumItems: PAGE_SIZE });
  return (
    <PaginatedList
      header={header}
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty={{
        icon: 'people-outline',
        title: 'Aucune communauté',
        description: 'Rejoignez une communauté depuis l’onglet Communauté, ou créez la vôtre.',
      }}
      renderItem={(community) => (
        <ListRow
          icon="people-outline"
          title={community.name}
          trailing={roleLabels[community.role] ? <Badge label={roleLabels[community.role]} tone="primary" /> : undefined}
          onPress={() =>
            router.push({ pathname: '/communities/[community]', params: { community: community.slug } })
          }
        />
      )}
    />
  );
}

function Posts({ header }: { header: React.ReactElement }) {
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(api.me.queries.getMyPosts, {}, { initialNumItems: PAGE_SIZE });
  return (
    <PaginatedList
      header={header}
      results={results}
      status={status}
      loadMore={loadMore}
      pageSize={PAGE_SIZE}
      empty={{
        icon: 'chatbubbles-outline',
        title: 'Aucune publication',
        description: 'Partagez une question, un bon plan ou une actualité avec la communauté.',
      }}
      renderItem={(post) => (
        <ListRow
          icon="chatbubble-ellipses-outline"
          title={post.title}
          subtitle={timeAgo(post._creationTime)}
          onPress={() => router.push({ pathname: '/posts/[slug]', params: { slug: post.slug } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, marginBottom: Spacing.one },
});
