import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CenteredMessage, Section } from '@/components/detail';
import { PostCard } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const PAGE_SIZE = 10;
const privacyLabels = { public: 'Publique', private: 'Privée', secret: 'Secrète' } as const;

export default function CommunityScreen() {
  const { community: slug } = useLocalSearchParams<{ community: string }>();
  const community = useQuery(api.communities.queries.getCommunityDetails, { slug });
  const membership = useQuery(
    api.communities.queries.isMember,
    community ? { communityId: community._id } : 'skip',
  );
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.queries.getCommunityPosts,
    { communitySlug: slug },
    { initialNumItems: PAGE_SIZE },
  );

  if (community === undefined) return <ActivityIndicator style={styles.loader} />;
  if (community === null) return <CenteredMessage title="Communauté introuvable" />;

  const canSeePosts = community.privacy === 'public' || Boolean(membership);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: community.name }} />
      <FlatList
        data={canSeePosts ? results : []}
        keyExtractor={(post) => post._id}
        renderItem={({ item }) => <PostCard post={item} showCommunity={false} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">{community.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {privacyLabels[community.privacy]} · {community.membersCount} membre(s) ·{' '}
              {community.postsCount} publication(s)
              {community.city ? ` · ${community.city}` : ''}
            </ThemedText>
            <ThemedText>{community.description}</ThemedText>
            <MembershipActions
              communityId={community._id}
              membershipRole={membership === undefined ? undefined : (membership?.role ?? null)}
            />
            {community.rules ? <Section title="Règles" body={community.rules} /> : null}
            <ThemedText type="smallBold">Publications</ThemedText>
          </View>
        }
        ListEmptyComponent={
          !canSeePosts ? (
            <ThemedText themeColor="textSecondary">
              Rejoignez cette communauté privée pour voir ses publications.
            </ThemedText>
          ) : status === 'LoadingFirstPage' ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <ThemedText themeColor="textSecondary">Aucune publication pour le moment.</ThemedText>
          )
        }
        ListFooterComponent={
          status === 'LoadingMore' ? <ActivityIndicator style={styles.loader} /> : undefined
        }
        onEndReached={() => {
          if (canSeePosts && status === 'CanLoadMore') loadMore(PAGE_SIZE);
        }}
        onEndReachedThreshold={0.5}
      />
    </ThemedView>
  );
}

function MembershipActions({
  communityId,
  membershipRole,
}: {
  communityId: Id<'communities'>;
  /** undefined while loading, null when not a member. */
  membershipRole: string | null | undefined;
}) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const join = useMutation(api.communities.mutations.joinCommunity);
  const leave = useMutation(api.communities.mutations.leaveCommunity);
  const [pending, setPending] = useState(false);

  if (!isAuthenticated) {
    return <Button label="Se connecter pour rejoindre" onPress={() => router.navigate('/account')} />;
  }
  if (membershipRole === undefined) return <Button label="Rejoindre" loading onPress={() => {}} />;

  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    try {
      await action();
    } catch {
      Alert.alert('Erreur', 'L’opération a échoué. Réessayez.');
    } finally {
      setPending(false);
    }
  };

  if (membershipRole === null) {
    return (
      <Button label="Rejoindre" primary loading={pending} onPress={() => run(() => join({ communityId }))} />
    );
  }
  return (
    <View style={styles.actions}>
      <Button
        label="Publier dans cette communauté"
        primary
        onPress={() => router.push({ pathname: '/posts/new', params: { communityId } })}
      />
      {membershipRole !== 'admin' ? (
        <Button
          label="Quitter la communauté"
          loading={pending}
          onPress={() =>
            Alert.alert('Quitter la communauté ?', undefined, [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Quitter', style: 'destructive', onPress: () => run(() => leave({ communityId })) },
            ])
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: Spacing.five },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.three, marginBottom: Spacing.two },
  actions: { gap: Spacing.two },
});
