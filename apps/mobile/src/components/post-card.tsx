import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { Card } from './card';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/time';

type PostSummary = Pick<
  Doc<'posts'>,
  '_id' | '_creationTime' | 'slug' | 'title' | 'content' | 'authorName' | 'communityName'
> & { likesCount: number; commentsCount?: number; userHasLiked?: boolean; authorImage?: string | null };

export function PostCard({ post, showCommunity = true }: { post: PostSummary; showCommunity?: boolean }) {
  const router = useRouter();
  const theme = useTheme();
  const meta = [showCommunity ? post.communityName : undefined, timeAgo(post._creationTime)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card
      accessibilityLabel={post.title}
      onPress={() => router.push({ pathname: '/posts/[slug]', params: { slug: post.slug } })}>
      <View style={styles.author}>
        <Avatar name={post.authorName} uri={post.authorImage} size={36} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {post.authorName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {meta}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="heading" numberOfLines={2}>
        {post.title}
      </ThemedText>
      <ThemedText type="small" numberOfLines={3} style={styles.content}>
        {post.content}
      </ThemedText>
      <View style={[styles.counts, { borderTopColor: theme.border }]}>
        <View style={styles.count}>
          <Icon
            name={post.userHasLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={post.userHasLiked ? theme.destructive : theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {post.likesCount} j’aime
          </ThemedText>
        </View>
        {post.commentsCount !== undefined ? (
          <View style={styles.count}>
            <Icon name="chatbubble-outline" size={15} themeColor="textSecondary" />
            <ThemedText type="small" themeColor="textSecondary">
              {post.commentsCount} commentaire{post.commentsCount > 1 ? 's' : ''}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  author: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  content: { lineHeight: 21 },
  counts: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  count: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
