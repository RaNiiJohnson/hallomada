import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { MAX_LENGTH } from '@convex/utils/limits';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const PUBLIC = 'public';

export default function NewPostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string }>();
  const communities = useQuery(api.communities.queries.getMyCommunitiesForPosting);
  const createPost = useMutation(api.posts.mutations.createPost);
  const [target, setTarget] = useState<string>(params.communityId ?? PUBLIC);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const options = [
    { value: PUBLIC, label: 'Public' },
    ...(communities ?? []).map((community) => ({ value: community._id as string, label: community.name })),
  ];

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Champs requis', 'Ajoutez un titre et un contenu.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createPost({
        title: title.trim(),
        content: content.trim(),
        communityId: target === PUBLIC ? undefined : (target as Id<'communities'>),
      });
      if (typeof result === 'object' && result && 'retryAfter' in result) {
        Alert.alert('Trop de publications', 'Patientez un peu avant de publier à nouveau.');
        return;
      }
      router.back();
    } catch {
      Alert.alert('Erreur', 'La publication a échoué. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <ThemedText type="smallBold">Publier dans</ThemedText>
            <Segmented scroll options={options} value={target} onChange={setTarget} />
          </View>
          <FormField
            label="Titre"
            value={title}
            onChangeText={setTitle}
            maxLength={MAX_LENGTH.title}
            placeholder="De quoi voulez-vous parler ?"
          />
          <FormField
            label="Contenu"
            value={content}
            onChangeText={setContent}
            maxLength={MAX_LENGTH.description}
            multiline
            placeholder="Partagez une info, une question, un bon plan…"
          />
          <Button label="Publier" primary loading={submitting} onPress={submit} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  field: { gap: Spacing.two },
});
