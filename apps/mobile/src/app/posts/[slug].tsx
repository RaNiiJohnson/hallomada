import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { Button } from '@/components/button';
import { CenteredMessage } from '@/components/detail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/time';
import { webUrl } from '@/lib/web';

type Post = NonNullable<ReturnType<typeof useQuery<typeof api.posts.queries.getPostWithMeta>>>;
type Comment = NonNullable<Post['comments'][number]>;

export default function PostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const post = useQuery(api.posts.queries.getPostWithMeta, { slug });
  const user = useQuery(api.auth.auth.getCurrentUser);
  const likePost = useMutation(api.posts.likes.mutations.likePost);
  const deletePost = useAction(api.posts.actions.deletePost);

  if (post === undefined) return <ActivityIndicator style={styles.loader} />;
  if (post === null) return <CenteredMessage title="Publication introuvable" />;

  const isAuthor = user?._id === post.authorId;
  const comments = post.comments.filter((c): c is Comment => c !== null);

  const share = () => {
    const path = post.communitySlug
      ? `/communities/${post.communitySlug}/${post.slug}`
      : `/posts/${post.slug}`;
    const url = webUrl(path);
    void Share.share(url ? { message: `${post.title}\n${url}`, url } : { message: post.title });
  };

  const confirmDelete = () =>
    Alert.alert('Supprimer la publication ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost({ postId: post._id });
            router.back();
          } catch {
            Alert.alert('Erreur', 'La suppression a échoué.');
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: post.communityName ?? 'Publication' }} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {[post.authorName, post.communityName, timeAgo(post._creationTime)]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
            <ThemedText type="subtitle">{post.title}</ThemedText>
          </View>
          <ThemedText>{post.content}</ThemedText>

          <View style={styles.row}>
            <LikeToggle
              liked={post.userHasLiked}
              count={post.likesCount}
              onToggle={() => likePost({ postId: post._id })}
            />
            <ThemedText type="small" themeColor="textSecondary">
              💬 {post.commentsCount}
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <BookmarkButton resourceType="post" resourceId={post._id} isBookmarked={post.isBookmarked} />
            <Button label="Partager" onPress={share} />
            {isAuthor ? <Button label="Supprimer" onPress={confirmDelete} /> : null}
          </View>

          <ThemedText type="smallBold">Commentaires</ThemedText>
          <Composer
            placeholder="Écrire un commentaire…"
            target={{ kind: 'comment', postId: post._id }}
          />
          {comments.map((comment) => (
            <CommentItem key={comment._id} comment={comment} userId={user?._id} />
          ))}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function CommentItem({ comment, userId }: { comment: Comment; userId?: string }) {
  const likeComment = useMutation(api.posts.likes.mutations.likeComment);
  const likeReply = useMutation(api.posts.likes.mutations.likeReply);
  const deleteComment = useMutation(api.posts.comments.mutations.deleteComment);
  const deleteReply = useMutation(api.posts.comments.mutations.deleteReply);
  const [replying, setReplying] = useState(false);
  const replies = comment.replies.filter((r): r is NonNullable<typeof r> => r !== null);

  const confirm = (onConfirm: () => Promise<unknown>) =>
    Alert.alert('Supprimer ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void onConfirm().catch(() => {}) },
    ]);

  return (
    <ThemedView type="backgroundElement" style={styles.comment}>
      <ThemedText type="small" themeColor="textSecondary">
        {comment.authorName} · {timeAgo(comment._creationTime)}
      </ThemedText>
      <ThemedText>{comment.content}</ThemedText>
      <View style={styles.row}>
        <LikeToggle
          liked={comment.userHasLiked}
          count={comment.likesCount}
          onToggle={() => likeComment({ commentId: comment._id })}
        />
        <TextAction label="Répondre" onPress={() => setReplying((value) => !value)} />
        {userId === comment.authorId ? (
          <TextAction label="Supprimer" onPress={() => confirm(() => deleteComment({ commentId: comment._id }))} />
        ) : null}
      </View>

      {replies.map((reply) => (
        <View key={reply._id} style={styles.reply}>
          <ThemedText type="small" themeColor="textSecondary">
            {reply.authorName} · {timeAgo(reply._creationTime)}
          </ThemedText>
          <ThemedText type="small">{reply.content}</ThemedText>
          <View style={styles.row}>
            <LikeToggle
              liked={reply.userHasLiked}
              count={reply.likesCount}
              onToggle={() => likeReply({ replyId: reply._id })}
            />
            {userId === reply.authorId ? (
              <TextAction label="Supprimer" onPress={() => confirm(() => deleteReply({ replyId: reply._id }))} />
            ) : null}
          </View>
        </View>
      ))}

      {replying ? (
        <Composer
          placeholder="Écrire une réponse…"
          target={{ kind: 'reply', commentId: comment._id }}
          onSent={() => setReplying(false)}
        />
      ) : null}
    </ThemedView>
  );
}

function LikeToggle({
  liked,
  count,
  onToggle,
}: {
  liked: boolean;
  count: number;
  onToggle: () => Promise<unknown>;
}) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  return (
    <TextAction
      label={`${liked ? '♥' : '♡'} ${count}`}
      onPress={() => {
        if (!isAuthenticated) router.navigate('/account');
        else void onToggle().catch(() => Alert.alert('Erreur', 'Action impossible.'));
      }}
    />
  );
}

function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ComposerTarget =
  | { kind: 'comment'; postId: Id<'posts'> }
  | { kind: 'reply'; commentId: Id<'postComments'> };

function Composer({
  placeholder,
  target,
  onSent,
}: {
  placeholder: string;
  target: ComposerTarget;
  onSent?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const addComment = useMutation(api.posts.comments.mutations.addComment);
  const addReply = useMutation(api.posts.comments.mutations.addReply);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (!isAuthenticated) {
    return <Button label="Se connecter pour commenter" onPress={() => router.navigate('/account')} />;
  }

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      if (target.kind === 'comment') await addComment({ postId: target.postId, content });
      else await addReply({ commentId: target.commentId, content });
      setText('');
      onSent?.();
    } catch {
      Alert.alert('Erreur', 'Le message n’a pas pu être envoyé. Réessayez dans un instant.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.composer}>
      <TextInput
        style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline
        value={text}
        onChangeText={setText}
      />
      <Button label="Envoyer" primary loading={sending} disabled={!text.trim()} onPress={send} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: Spacing.five },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  actions: { gap: Spacing.two },
  comment: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  reply: { marginLeft: Spacing.three, paddingLeft: Spacing.two, borderLeftWidth: 2, borderLeftColor: '#8884', gap: Spacing.one },
  composer: { gap: Spacing.two },
  input: { minHeight: 48, borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16 },
});
