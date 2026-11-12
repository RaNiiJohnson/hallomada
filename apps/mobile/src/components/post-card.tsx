import type { Doc } from '@convex/_generated/dataModel';
import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/time';

type PostSummary = Pick<
  Doc<'posts'>,
  '_id' | '_creationTime' | 'slug' | 'title' | 'content' | 'authorName' | 'communityName'
> & { likesCount: number; commentsCount?: number; userHasLiked?: boolean };

export function PostCard({ post, showCommunity = true }: { post: PostSummary; showCommunity?: boolean }) {
  const meta = [
    post.authorName,
    showCommunity ? post.communityName : undefined,
    timeAgo(post._creationTime),
  ]
    .filter(Boolean)
    .join(' · ');
  const counts = [
    `${post.userHasLiked ? '♥' : '♡'} ${post.likesCount}`,
    post.commentsCount !== undefined ? `💬 ${post.commentsCount}` : null,
  ]
    .filter(Boolean)
    .join('   ');

  return (
    <Link href={{ pathname: '/posts/[slug]', params: { slug: post.slug } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {meta}
          </ThemedText>
          <ThemedText type="smallBold">{post.title}</ThemedText>
          <ThemedText type="small" numberOfLines={3}>
            {post.content}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {counts}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  pressed: { opacity: 0.7 },
});
