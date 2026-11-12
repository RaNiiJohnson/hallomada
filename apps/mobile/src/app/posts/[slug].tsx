import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { BookmarkButton } from '@/components/bookmark-button';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { ActionRow, CenteredMessage, LoadingScreen, SectionTitle } from '@/components/detail';
import { Icon, type IconName } from '@/components/icon';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { timeAgo } from '@/lib/time';
import { webUrl } from '@/lib/web';

type Post = NonNullable<ReturnType<typeof useQuery<typeof api.posts.queries.getPostWithMeta>>>;
type Comment = NonNullable<Post['comments'][number]>;
type Reply = NonNullable<Comment['replies'][number]>;

export default function PostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const post = useQuery(api.posts.queries.getPostWithMeta, { slug });
  const user = useQuery(api.auth.auth.getCurrentUser);
  const likePost = useMutation(api.posts.likes.mutations.likePost);
  const deletePost = useAction(api.posts.actions.deletePost);

  if (post === undefined) return <LoadingScreen />;
  if (post === null) {
    return (
      <CenteredMessage
        icon="chatbubbles-outline"
        title="Publication introuvable"
        description="Elle a peut-être été supprimée."
      />
    );
  }

  const isAuthor = user?._id === post.authorId;
  const comments = post.comments.filter((c): c is Comment => c !== null);

  const share = () => {
    const path = post.communitySlug ? `/communities/${post.communitySlug}/${post.slug}` : `/posts/${post.slug}`;
    const url = webUrl(path);
    void Share.share(url ? { message: `${post.title}\n${url}`, url } : { message: post.title });
  };

  const openOwnerMenu = () =>
    Alert.alert('Ma publication', undefined, [
      { text: 'Modifier', onPress: () => router.push({ pathname: '/posts/edit/[slug]', params: { slug: post.slug } }) },
      { text: 'Supprimer', style: 'destructive', onPress: confirmDelete },
      { text: 'Annuler', style: 'cancel' },
    ]);

  const confirmDelete = () =>
    Alert.alert('Supprimer la publication ?', 'Les commentaires seront aussi supprimés. Action irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost({ postId: post._id });
            router.back();
          } catch (error) {
            Alert.alert('Erreur', errorMessage(error, 'La suppression a échoué.'));
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
        <Stack.Screen
          options={{
            title: post.communityName ?? 'Publication',
            headerRight: isAuthor
              ? () => <IconButton icon="ellipsis-horizontal" tone="plain" label="Options" onPress={openOwnerMenu} />
              : undefined,
          }}
        />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.author}>
              <Avatar name={post.authorName} size={44} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">{post.authorName}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {timeAgo(post._creationTime)}
                  {post.updatedAt && post.updatedAt - post._creationTime > 60_000 ? ' · modifiée' : ''}
                </ThemedText>
              </View>
              {post.communityName && post.communitySlug ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/communities/[community]',
                      params: { community: post.communitySlug! },
                    })
                  }>
                  <Badge label={post.communityName} tone="primary" icon="people-outline" />
                </Pressable>
              ) : null}
            </View>
            <ThemedText type="subtitle">{post.title}</ThemedText>
            <ThemedText style={styles.body}>{post.content}</ThemedText>
            <View style={styles.stats}>
              <LikeToggle
                liked={post.userHasLiked}
                count={post.likesCount}
                onToggle={() => likePost({ postId: post._id })}
              />
              <Stat icon="chatbubble-outline" label={`${post.commentsCount}`} />
            </View>
          </Card>

          <ActionRow>
            <BookmarkButton resourceType="post" resourceId={post._id} isBookmarked={post.isBookmarked} />
            <Button label="Partager" icon="share-outline" onPress={share} />
            {isAuthor ? null : <ReportButton type="post" id={post._id} title={post.title} />}
          </ActionRow>

          <SectionTitle title={`Commentaires (${post.commentsCount})`} icon="chatbubbles-outline" />
          <Composer placeholder="Écrire un commentaire…" target={{ kind: 'comment', postId: post._id }} />
          {comments.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Soyez le premier à commenter.
            </ThemedText>
          ) : null}
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
  const deleteComment = useMutation(api.posts.comments.mutations.deleteComment);
  const updateComment = useMutation(api.posts.comments.mutations.updateComment);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const replies = comment.replies.filter((r): r is Reply => r !== null);
  const isMine = userId === comment.authorId;

  return (
    <Card style={styles.comment}>
      <Byline name={comment.authorName} time={comment._creationTime} />
      {editing ? (
        <InlineEditor
          initial={comment.content}
          onCancel={() => setEditing(false)}
          onSave={async (content) => {
            await updateComment({ commentId: comment._id, content });
            setEditing(false);
          }}
        />
      ) : (
        <ThemedText style={styles.body}>{comment.content}</ThemedText>
      )}
      <View style={styles.stats}>
        <LikeToggle
          liked={comment.userHasLiked}
          count={comment.likesCount}
          onToggle={() => likeComment({ commentId: comment._id })}
        />
        <TextAction icon="arrow-undo-outline" label="Répondre" onPress={() => setReplying((value) => !value)} />
        {isMine && !editing ? (
          <OwnerActions
            onEdit={() => setEditing(true)}
            onDelete={() => deleteComment({ commentId: comment._id })}
          />
        ) : null}
      </View>

      {replies.map((reply) => (
        <ReplyItem key={reply._id} reply={reply} userId={userId} />
      ))}

      {replying ? (
        <Composer
          placeholder="Écrire une réponse…"
          target={{ kind: 'reply', commentId: comment._id }}
          onSent={() => setReplying(false)}
          autoFocus
        />
      ) : null}
    </Card>
  );
}

function ReplyItem({ reply, userId }: { reply: Reply; userId?: string }) {
  const theme = useTheme();
  const likeReply = useMutation(api.posts.likes.mutations.likeReply);
  const deleteReply = useMutation(api.posts.comments.mutations.deleteReply);
  const updateReply = useMutation(api.posts.comments.mutations.updateReply);
  const [editing, setEditing] = useState(false);

  return (
    <View style={[styles.reply, { borderLeftColor: theme.primarySoft }]}>
      <Byline name={reply.authorName} time={reply._creationTime} small />
      {editing ? (
        <InlineEditor
          initial={reply.content}
          onCancel={() => setEditing(false)}
          onSave={async (content) => {
            await updateReply({ replyId: reply._id, content });
            setEditing(false);
          }}
        />
      ) : (
        <ThemedText type="small" style={styles.body}>
          {reply.content}
        </ThemedText>
      )}
      <View style={styles.stats}>
        <LikeToggle
          liked={reply.userHasLiked}
          count={reply.likesCount}
          onToggle={() => likeReply({ replyId: reply._id })}
        />
        {userId === reply.authorId && !editing ? (
          <OwnerActions onEdit={() => setEditing(true)} onDelete={() => deleteReply({ replyId: reply._id })} />
        ) : null}
      </View>
    </View>
  );
}

function Byline({ name, time, small }: { name: string; time: number; small?: boolean }) {
  return (
    <View style={styles.byline}>
      <Avatar name={name} size={small ? 24 : 30} />
      <ThemedText type="smallBold" numberOfLines={1} style={styles.flexShrink}>
        {name}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        · {timeAgo(time)}
      </ThemedText>
    </View>
  );
}

function OwnerActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => Promise<unknown> }) {
  const confirm = () =>
    Alert.alert('Supprimer ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          void onDelete().catch((error) => Alert.alert('Erreur', errorMessage(error, 'Suppression impossible.'))),
      },
    ]);
  return (
    <>
      <TextAction icon="pencil-outline" label="Modifier" onPress={onEdit} />
      <TextAction icon="trash-outline" label="Supprimer" onPress={confirm} />
    </>
  );
}

function InlineEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const content = text.trim();
    if (!content) return;
    setSaving(true);
    try {
      await onSave(content);
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, 'Modification impossible.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.editor}>
      <TextInput
        style={[styles.input, { backgroundColor: theme.muted, color: theme.text, borderColor: theme.primary }]}
        multiline
        autoFocus
        maxLength={2000}
        value={text}
        onChangeText={setText}
      />
      <View style={styles.editorActions}>
        <Button label="Annuler" variant="ghost" size="sm" onPress={onCancel} />
        <Button label="Enregistrer" primary size="sm" loading={saving} disabled={!text.trim()} onPress={save} />
      </View>
    </View>
  );
}

function Stat({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={17} themeColor="textSecondary" />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function LikeToggle({ liked, count, onToggle }: { liked: boolean; count: number; onToggle: () => Promise<unknown> }) {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Je n’aime plus' : 'J’aime'}
      hitSlop={8}
      style={styles.stat}
      onPress={() => {
        if (!isAuthenticated) router.navigate('/account');
        else void onToggle().catch(() => Alert.alert('Erreur', 'Action impossible.'));
      }}>
      <Icon name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? theme.destructive : theme.textSecondary} />
      <ThemedText type="small" style={{ color: liked ? theme.destructive : theme.textSecondary }}>
        {count}
      </ThemedText>
    </Pressable>
  );
}

function TextAction({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.stat}>
      <Icon name={icon} size={15} themeColor="textSecondary" />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ComposerTarget = { kind: 'comment'; postId: Id<'posts'> } | { kind: 'reply'; commentId: Id<'postComments'> };

function Composer({
  placeholder,
  target,
  onSent,
  autoFocus,
}: {
  placeholder: string;
  target: ComposerTarget;
  onSent?: () => void;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const addComment = useMutation(api.posts.comments.mutations.addComment);
  const addReply = useMutation(api.posts.comments.mutations.addReply);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button
        label="Se connecter pour commenter"
        icon="log-in-outline"
        variant="outline"
        onPress={() => router.navigate('/account')}
      />
    );
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
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, 'Le message n’a pas pu être envoyé. Réessayez dans un instant.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.composer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TextInput
        style={[styles.composerInput, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline
        autoFocus={autoFocus}
        maxLength={2000}
        value={text}
        onChangeText={setText}
      />
      <IconButton
        icon="send"
        tone="primary"
        label="Envoyer"
        size={38}
        onPress={() => {
          if (!sending && text.trim()) void send();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  center: { textAlign: 'center' },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  author: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  body: { lineHeight: 23 },
  stats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.four },
  stat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  comment: { gap: Spacing.two },
  byline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reply: { marginLeft: Spacing.two, paddingLeft: Spacing.three, borderLeftWidth: 2, gap: Spacing.one + 2 },
  editor: { gap: Spacing.two },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  input: { minHeight: 64, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.three, fontSize: 16 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingLeft: Spacing.three,
    padding: Spacing.one + 2,
  },
  composerInput: { flex: 1, minHeight: 38, maxHeight: 140, fontSize: 16, paddingVertical: Spacing.two },
});
