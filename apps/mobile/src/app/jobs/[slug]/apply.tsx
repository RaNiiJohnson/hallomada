import { api } from '@convex/_generated/api';
import { useAction, useMutation, useQuery } from 'convex/react';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useApplicationQuota } from '@/hooks/use-application-quota';
import { useTheme } from '@/hooks/use-theme';
import { uploadLocalFile } from '@/lib/upload';

const PDF = 'application/pdf' as const;
const MAX_CV_SIZE = 5 * 1024 * 1024;

type PickedCv = { uri: string; name: string; size?: number };

export default function ApplyScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const theme = useTheme();
  const job = useQuery(api.jobs.queries.getJobWithContact, { slug });
  const user = useQuery(api.auth.auth.getCurrentUser);
  const quota = useApplicationQuota();
  const generateUrl = useMutation(api.integrations.r2.generateApplicationCvUploadUrl);
  const syncMetadata = useAction(api.integrations.r2.syncMetadata);
  const applyToJob = useAction(api.jobs.actions.applyToJob);

  const [cv, setCv] = useState<PickedCv | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (job === undefined || user === undefined) {
    return <ActivityIndicator style={styles.loader} />;
  }
  if (job === null || user === null) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">
          {user === null ? 'Connectez-vous pour postuler.' : 'Offre introuvable.'}
        </ThemedText>
      </ThemedView>
    );
  }

  const hasProfileCv = Boolean(user.cv);
  const quotaReached = quota != null && quota.limit !== null && quota.remaining === 0;

  const pickCv = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: PDF, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size !== undefined && asset.size > MAX_CV_SIZE) {
      Alert.alert('Fichier trop lourd', 'Le CV doit faire 5 Mo maximum.');
      return;
    }
    setCv({ uri: asset.uri, name: asset.name, size: asset.size });
  };

  const submit = async () => {
    if (!cv && !hasProfileCv) {
      Alert.alert('CV manquant', 'Veuillez fournir un CV.');
      return;
    }
    setSubmitting(true);
    try {
      const applicationCvKey = cv
        ? await uploadLocalFile({ uri: cv.uri, mimeType: PDF }, generateUrl, syncMetadata)
        : undefined;
      await applyToJob({
        jobId: job._id,
        applicationCvKey,
        coverLetter: coverLetter.trim() || undefined,
        locale: 'fr',
      });
      Alert.alert('Candidature envoyée', 'Candidature envoyée avec succès !');
      router.back();
    } catch {
      Alert.alert('Erreur', "Erreur lors de l'envoi de la candidature.");
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
          <View style={styles.header}>
            <ThemedText type="subtitle">{job.title}</ThemedText>
            <ThemedText themeColor="textSecondary">{job.company}</ThemedText>
          </View>

          {quota && quota.limit !== null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {quotaReached
                ? 'Vous avez utilisé toutes vos candidatures gratuites ce mois-ci.'
                : `Candidatures restantes ce mois-ci : ${quota.remaining} / ${quota.limit}`}
            </ThemedText>
          ) : null}

          <View style={styles.section}>
            <ThemedText type="smallBold">CV (PDF, max 5 Mo)</ThemedText>
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="small">
                {cv
                  ? `${cv.name} — utilisé uniquement pour cette candidature.`
                  : hasProfileCv
                    ? 'Votre CV de profil sera utilisé par défaut.'
                    : "Vous n'avez pas encore de CV de profil. Ajoutez un CV pour cette candidature."}
              </ThemedText>
            </ThemedView>
            <Button
              label={cv ? 'Changer de fichier' : hasProfileCv ? 'Utiliser un autre CV' : 'Choisir un PDF'}
              onPress={pickCv}
              disabled={submitting}
            />
            {cv ? (
              <Button label="Retirer ce fichier" onPress={() => setCv(null)} disabled={submitting} />
            ) : null}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Lettre de motivation (optionnel)</ThemedText>
            <TextInput
              style={[styles.textarea, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="Expliquez au recruteur pourquoi vous correspondez à ce poste..."
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlignVertical="top"
              value={coverLetter}
              onChangeText={setCoverLetter}
            />
          </View>

          <Button
            label="Soumettre la candidature"
            primary
            loading={submitting}
            disabled={quotaReached || (!cv && !hasProfileCv)}
            onPress={submit}
          />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: Spacing.five },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  content: { padding: Spacing.three, gap: Spacing.four },
  header: { gap: Spacing.one },
  section: { gap: Spacing.two },
  notice: { padding: Spacing.three, borderRadius: Spacing.three },
  textarea: {
    minHeight: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
  },
});
