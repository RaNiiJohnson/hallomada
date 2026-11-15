import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
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

import { BookmarkIcon } from '@/components/bookmark-button';
import { Button, IconButton } from '@/components/button';
import { CenteredMessage, LoadingScreen } from '@/components/detail';
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
  const { slug, focus } = useLocalSearchParams<{ slug: string; focus?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const commentsY = useRef(0);
  const focused = useRef(false);
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

  const openComments = () => scrollRef.current?.scrollTo({ y: commentsY.current, animated: true });

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
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.post}>
            {post.communityName && post.communitySlug ? (
              <Pressable
                accessibilityRole="link"
                style={({ pressed }) => [styles.crumb, pressed && styles.pressed]}
                onPress={() =>
                  router.push({ pathname: '/communities/[community]', params: { community: post.communitySlug! } })
                }>
                <Icon name="people-outline" size={14} themeColor="textSecondary" />
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {post.communityName}
                </ThemedText>
              </Pressable>
            ) : null}
            <Byline
              name={post.authorName ?? 'Anonyme'}
              time={post._creationTime}
              edited={Boolean(post.updatedAt && post.updatedAt - post._creationTime > 60_000)}
            />
            <ThemedText style={styles.title}>{post.title}</ThemedText>
            <ThemedText style={styles.body}>{post.content}</ThemedText>
            <View style={styles.actions}>
              <Action icon="chatbubble-outline" label="Commentaires" count={post.commentsCount} onPress={openComments} />
              <LikeToggle
                liked={post.userHasLiked}
                count={post.likesCount}
                onToggle={() => likePost({ postId: post._id })}
              />
              <Action icon="share-social-outline" label="Partager" onPress={share} />
              <BookmarkIcon resourceType="post" resourceId={post._id} isBookmarked={post.isBookmarked} />
              {isAuthor ? null : <ReportButton compact type="post" id={post._id} title={post.title} />}
            </View>
          </View>

          <View
            style={[styles.commentsHeader, { borderTopColor: theme.border }]}
            onLayout={(event) => {
              commentsY.current = event.nativeEvent.layout.y;
              // Coming from a feed's comment button: jump straight to the thread once.
              if (focus === 'comments' && !focused.current) {
                focused.current = true;
                scrollRef.current?.scrollTo({ y: commentsY.current, animated: false });
              }
            }}>
            <ThemedText style={styles.commentsTitle}>
              {post.commentsCount} commentaire{post.commentsCount > 1 ? 's' : ''}
            </ThemedText>
            <Composer placeholder="Écrire un commentaire…" target={{ kind: 'comment', postId: post._id }} />
          </View>
          {comments.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Soyez le premier à commenter.
            </ThemedText>
          ) : (
            <View>
              {comments.map((comment, index) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  userId={user?._id}
                  divider={index < comments.length - 1}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function CommentItem({ comment, userId, divider }: { comment: Comment; userId?: string; divider: boolean }) {
  const theme = useTheme();
  const likeComment = useMutation(api.posts.likes.mutations.likeComment);
  const deleteComment = useMutation(api.posts.comments.mutations.deleteComment);
  const updateComment = useMutation(api.posts.comments.mutations.updateComment);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const replies = comment.replies.filter((r): r is Reply => r !== null);
  const isMine = userId === comment.authorId;

  return (
    <View
      style={[
        styles.comment,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}>
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
        {replies.length > 0 ? (
          <TextAction
            icon={showReplies ? 'chevron-up' : 'chevron-down'}
            label={`${replies.length} réponse${replies.length > 1 ? 's' : ''}`}
            onPress={() => setShowReplies((value) => !value)}
          />
        ) : null}
        <TextAction icon="arrow-undo-outline" label="Répondre" onPress={() => setReplying((value) => !value)} />
        {isMine && !editing ? (
          <OwnerActions
            onEdit={() => setEditing(true)}
            onDelete={() => deleteComment({ commentId: comment._id })}
          />
        ) : null}
      </View>

      {showReplies
        ? replies.map((reply) => <ReplyItem key={reply._id} reply={reply} userId={userId} />)
        : null}

      {replying ? (
        <Composer
          placeholder="Écrire une réponse…"
          target={{ kind: 'reply', commentId: comment._id }}
          onSent={() => {
            setReplying(false);
            setShowReplies(true);
          }}
          autoFocus
        />
      ) : null}
    </View>
  );
}

function ReplyItem({ reply, userId }: { reply: Reply; userId?: string }) {
  const theme = useTheme();
  const likeReply = useMutation(api.posts.likes.mutations.likeReply);
  const deleteReply = useMutation(api.posts.comments.mutations.deleteReply);
  const updateReply = useMutation(api.posts.comments.mutations.updateReply);
  const [editing, setEditing] = useState(false);

  return (
    <View style={[styles.reply, { borderLeftColor: theme.border }]}>
      <Byline name={reply.authorName} time={reply._creationTime} />
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

/** Web byline: author name in green, then "· time". */
function Byline({ name, time, edited }: { name: string; time: number; edited?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.byline}>
      <ThemedText type="small" numberOfLines={1} style={[styles.flexShrink, { color: theme.primary, fontWeight: 600 }]}>
        {name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        · {timeAgo(time)}
        {edited ? ' · modifiée' : ''}
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

function Action({
  icon,
  label,
  count,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Icon name={icon} size={17} themeColor="textSecondary" />
      {count !== undefined ? (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.count}>
          {count}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

/** Like toggle with the web check mark, green once liked. */
function LikeToggle({ liked, count, onToggle }: { liked: boolean; count: number; onToggle: () => Promise<unknown> }) {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const color = liked ? theme.primary : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Retirer le j’aime' : 'J’aime'}
      accessibilityState={{ selected: liked }}
      hitSlop={6}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      onPress={() => {
        if (!isAuthenticated) router.navigate('/account');
        else void onToggle().catch(() => Alert.alert('Erreur', 'Action impossible.'));
      }}>
      <Icon name={liked ? 'checkmark-circle' : 'checkmark'} size={17} color={color} />
      <ThemedText type="caption" style={[styles.count, { color }]}>
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
  flexShrink: { flexShrink: 1 },
  pressed: { opacity: 0.6 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  post: { gap: Spacing.two, paddingBottom: Spacing.two },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  body: { lineHeight: 23 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.one, marginLeft: -Spacing.two },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: 18,
  },
  count: { fontWeight: 600 },
  commentsHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  commentsTitle: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  empty: { textAlign: 'center', paddingVertical: Spacing.three },
  stats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: Spacing.three, marginLeft: -Spacing.two },
  stat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  comment: { paddingVertical: Spacing.three, gap: Spacing.one + 2 },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reply: { marginLeft: Spacing.one, marginTop: Spacing.one, paddingLeft: Spacing.three, borderLeftWidth: 2, gap: Spacing.one },
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
