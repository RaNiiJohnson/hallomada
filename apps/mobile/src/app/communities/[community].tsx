import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useAction, useConvexAuth, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { ActionRow, CenteredMessage, LoadingScreen, Section, SectionTitle } from '@/components/detail';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { webUrl } from '@/lib/web';

const PAGE_SIZE = 10;

export default function CommunityScreen() {
  const { community: slug } = useLocalSearchParams<{ community: string }>();
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const community = useQuery(api.communities.queries.getCommunityDetails, { slug });
  const deleteCommunity = useAction(api.communities.actions.deleteCommunity);
  const membership = useQuery(
    api.communities.queries.isMember,
    community ? { communityId: community._id } : 'skip',
  );
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.queries.getCommunityPosts,
    { communitySlug: slug },
    { initialNumItems: PAGE_SIZE },
  );

  if (community === undefined) return <LoadingScreen />;
  if (community === null) {
    return <CenteredMessage icon="people-outline" title="Communauté introuvable" description="Elle a peut-être été supprimée." />;
  }

  const isOwner = user?._id === community.authorId;
  const canSeePosts = community.privacy === 'public' || Boolean(membership);
  const focus = community.city ?? community.theme;

  const share = () => {
    const url = webUrl(`/communities/${community.slug}`);
    void Share.share(url ? { message: `${community.name}\n${url}`, url } : { message: community.name });
  };

  const openOwnerMenu = () =>
    Alert.alert('Ma communauté', undefined, [
      {
        text: 'Modifier',
        onPress: () => router.push({ pathname: '/communities/edit/[community]', params: { community: community.slug } }),
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Supprimer la communauté ?',
            'Toutes ses publications et ses membres seront supprimés. Action irréversible.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteCommunity({ id: community._id });
                    router.back();
                  } catch (error) {
                    Alert.alert('Erreur', errorMessage(error, 'La suppression a échoué.'));
                  }
                },
              },
            ],
          ),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: community.name,
          headerRight: isOwner
            ? () => <IconButton icon="ellipsis-horizontal" tone="plain" label="Options" onPress={openOwnerMenu} />
            : undefined,
        }}
      />
      <FlatList
        data={canSeePosts ? results : []}
        keyExtractor={(post) => post._id}
        renderItem={({ item }) => <PostCard post={item} showCommunity={false} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card style={styles.hero}>
              <View style={styles.heroTop}>
                <Avatar name={community.name} size={64} />
                <View style={styles.flex}>
                  <ThemedText type="subtitle">{community.name}</ThemedText>
                  <View style={styles.badges}>
                    {focus ? (
                      <Badge
                        label={focus}
                        icon={community.city ? 'location-outline' : 'pricetag-outline'}
                        tone={community.city ? 'info' : 'primary'}
                      />
                    ) : null}
                    {community.privacy === 'private' ? <Badge label="Privée" icon="lock-closed-outline" /> : null}
                    {membership?.role === 'admin' ? <Badge label="Admin" tone="warning" icon="star-outline" /> : null}
                  </View>
                </View>
              </View>
              <View style={styles.counts}>
                <Count icon="people-outline" value={community.membersCount} label="membre" />
                <Count icon="chatbubbles-outline" value={community.postsCount} label="publication" />
              </View>
              <ThemedText style={styles.body}>{community.description}</ThemedText>
              <MembershipActions
                communityId={community._id}
                membershipRole={membership === undefined ? undefined : (membership?.role ?? null)}
              />
            </Card>
            <ActionRow>
              <Button label="Partager" icon="share-outline" onPress={share} />
              {isOwner ? null : <ReportButton type="community" id={community._id} title={community.name} />}
            </ActionRow>
            {community.rules ? <Section title="Règles" icon="list-outline" body={community.rules} /> : null}
            <SectionTitle title="Publications" icon="newspaper-outline" />
          </View>
        }
        ListEmptyComponent={
          !canSeePosts ? (
            <EmptyState
              icon="lock-closed-outline"
              title="Communauté privée"
              description="Rejoignez-la pour voir ses publications."
            />
          ) : status === 'LoadingFirstPage' ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="Aucune publication"
              description={membership ? 'Lancez la première discussion.' : 'Rejoignez la communauté pour publier.'}
            />
          )
        }
        ListFooterComponent={status === 'LoadingMore' ? <ActivityIndicator style={styles.loader} /> : undefined}
        onEndReached={() => {
          if (canSeePosts && status === 'CanLoadMore') loadMore(PAGE_SIZE);
        }}
        onEndReachedThreshold={0.5}
      />
    </ThemedView>
  );
}

function Count({ icon, value, label }: { icon: 'people-outline' | 'chatbubbles-outline'; value: number; label: string }) {
  return (
    <View style={styles.count}>
      <Icon name={icon} size={16} themeColor="textSecondary" />
      <ThemedText type="small" themeColor="textSecondary">
        <ThemedText type="smallBold">{value}</ThemedText> {label}
        {value > 1 ? 's' : ''}
      </ThemedText>
    </View>
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
    return (
      <Button label="Se connecter pour rejoindre" icon="log-in-outline" primary onPress={() => router.navigate('/account')} />
    );
  }
  if (membershipRole === undefined) return <Button label="Rejoindre" loading onPress={() => {}} />;

  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    try {
      await action();
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, 'L’opération a échoué. Réessayez.'));
    } finally {
      setPending(false);
    }
  };

  if (membershipRole === null) {
    return (
      <Button
        label="Rejoindre la communauté"
        icon="person-add-outline"
        primary
        loading={pending}
        onPress={() => run(() => join({ communityId }))}
      />
    );
  }
  return (
    <View style={styles.memberActions}>
      <Button
        label="Publier"
        icon="create-outline"
        primary
        style={styles.flex}
        onPress={() => router.push({ pathname: '/posts/new', params: { communityId } })}
      />
      {membershipRole !== 'admin' ? (
        <Button
          label="Quitter"
          icon="exit-outline"
          variant="ghost"
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
  flex: { flex: 1 },
  loader: { marginTop: Spacing.five },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.three },
  hero: { gap: Spacing.three },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  counts: { flexDirection: 'row', gap: Spacing.four },
  count: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  body: { lineHeight: 23 },
  memberActions: { flexDirection: 'row', gap: Spacing.two },
});
