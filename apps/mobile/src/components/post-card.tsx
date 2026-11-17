import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { useConvexAuth, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { BookmarkIcon } from './bookmark-button';
import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/time';
import { webUrl } from '@/lib/web';

type PostSummary = Pick<
  Doc<'posts'>,
  '_id' | '_creationTime' | 'slug' | 'title' | 'content' | 'authorName' | 'communityName' | 'communitySlug'
> & {
  likesCount: number;
  commentsCount?: number;
  userHasLiked?: boolean;
  isBookmarked?: boolean;
  author?: { image?: string | null; slug?: string | null } | null;
};

/**
 * Feed item, styled like the web feed on mobile: flat row with a hairline
 * divider, "author › community" line, bold title, excerpt, time and icon actions.
 */
export function PostCard({
  post,
  showCommunity = true,
  divider = true,
}: {
  post: PostSummary;
  showCommunity?: boolean;
  /** Hairline under the item; turn it off for the last item of a boxed group. */
  divider?: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const likePost = useMutation(api.posts.likes.mutations.likePost);

  const open = (hash?: 'comments') =>
    router.push({ pathname: '/posts/[slug]', params: { slug: post.slug, ...(hash ? { focus: hash } : {}) } });

  const like = async () => {
    if (!isAuthenticated) {
      router.navigate('/account');
      return;
    }
    try {
      await likePost({ postId: post._id });
    } catch {
      Alert.alert('Erreur', 'Impossible d’enregistrer le j’aime.');
    }
  };

  const share = () => {
    const path = post.communitySlug ? `/communities/${post.communitySlug}/${post.slug}` : `/posts/${post.slug}`;
    const url = webUrl(path);
    void Share.share(url ? { message: `${post.title}\n${url}`, url } : { message: post.title });
  };

  const authorSlug = post.author?.slug;

  return (
    <View style={[styles.item, divider && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.byline}>
        <Pressable
          disabled={!authorSlug}
          onPress={() => authorSlug && router.push({ pathname: '/profiles/[slug]', params: { slug: authorSlug } })}
          style={({ pressed }) => [styles.author, pressed && styles.pressed]}>
          <Avatar name={post.authorName} uri={post.author?.image} size={28} />
          <ThemedText type="caption" numberOfLines={1} style={[styles.shrink, { color: theme.text, opacity: 0.8 }]}>
            {post.authorName}
          </ThemedText>
        </Pressable>
        {showCommunity ? (
          <>
            <Icon name="chevron-forward" size={12} color={theme.textSecondary} />
            {post.communitySlug && post.communityName ? (
              <Pressable
                style={styles.shrink}
                onPress={() =>
                  router.push({ pathname: '/communities/[community]', params: { community: post.communitySlug! } })
                }>
                <ThemedText type="caption" numberOfLines={1} style={{ color: theme.primary, fontWeight: 600 }}>
                  {post.communityName}
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="caption" numberOfLines={1} themeColor="textSecondary" style={{ fontWeight: 600 }}>
                Publication publique
              </ThemedText>
            )}
          </>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={post.title}
        onPress={() => open()}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <ThemedText style={styles.title}>{post.title}</ThemedText>
        {post.content ? (
          <ThemedText type="small" numberOfLines={4} style={[styles.excerpt, { color: theme.text }]}>
            {post.content}
          </ThemedText>
        ) : null}
        <ThemedText type="caption" themeColor="textSecondary" style={styles.time}>
          {timeAgo(post._creationTime)}
        </ThemedText>
      </Pressable>

      <View style={styles.actions}>
        <Action
          icon="chatbubble-outline"
          label="Commentaires"
          count={post.commentsCount ?? 0}
          onPress={() => open('comments')}
        />
        <Action
          icon={post.userHasLiked ? 'checkmark-circle' : 'checkmark'}
          label={post.userHasLiked ? 'Retirer le j’aime' : 'J’aime'}
          count={post.likesCount}
          active={post.userHasLiked}
          onPress={like}
        />
        <Action icon="share-social-outline" label="Partager" onPress={share} />
        <BookmarkIcon resourceType="post" resourceId={post._id} isBookmarked={post.isBookmarked ?? false} />
      </View>
    </View>
  );
}

function Action({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  onPress: () => void;
}): ReactNode {
  const theme = useTheme();
  const color = active ? theme.primary : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Icon name={icon} size={17} color={color} />
      {count !== undefined ? (
        <ThemedText type="caption" style={{ color, fontWeight: 600 }}>
          {count}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: Spacing.three, gap: Spacing.two },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  shrink: { flexShrink: 1 },
  body: { gap: Spacing.one },
  title: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  excerpt: { lineHeight: 20, opacity: 0.75 },
  time: { marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginLeft: -Spacing.two },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: 18,
  },
  pressed: { opacity: 0.6 },
});
