import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { MAX_LENGTH } from '@convex/utils/limits';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { CenteredMessage, LoadingScreen } from '@/components/detail';
import { FormField } from '@/components/form-field';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';

export default function EditPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const post = useQuery(api.posts.queries.getPostWithMeta, { slug });

  if (post === undefined) return <LoadingScreen />;
  if (post === null) return <CenteredMessage title="Publication introuvable" />;
  return <EditPostForm postId={post._id} initialTitle={post.title} initialContent={post.content} />;
}

function EditPostForm({
  postId,
  initialTitle,
  initialContent,
}: {
  postId: Id<'posts'>;
  initialTitle: string;
  initialContent: string;
}) {
  const router = useRouter();
  const updatePost = useMutation(api.posts.mutations.updatePost);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Champs requis', 'Ajoutez un titre et un contenu.');
      return;
    }
    setSaving(true);
    try {
      await updatePost({ postId, title: title.trim(), content: content.trim() });
      router.back();
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, 'La modification a échoué.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormField label="Titre" value={title} onChangeText={setTitle} maxLength={MAX_LENGTH.title} />
          <FormField
            label="Contenu"
            value={content}
            onChangeText={setContent}
            maxLength={MAX_LENGTH.description}
            multiline
          />
          <Button label="Enregistrer" icon="checkmark" primary loading={saving} onPress={save} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});
