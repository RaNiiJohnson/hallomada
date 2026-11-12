import { api } from '@convex/_generated/api';
import { useAction, useQuery } from 'convex/react';
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
import { CenteredMessage } from '@/components/detail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_MESSAGE = 1000;

/** Sends the viewer's rental dossier (prepared on the web) to a rental listing. */
export default function SendDossierScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const theme = useTheme();
  const listing = useQuery(api.listings.queries.getListingWithContact, { slug });
  const mine = useQuery(api.rentalFiles.queries.getMine);
  const send = useAction(api.rentalFiles.actions.sendRentalFile);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (listing === undefined || mine === undefined) {
    return <ActivityIndicator style={styles.loader} />;
  }
  if (listing === null) return <CenteredMessage title="Annonce introuvable" />;

  const documentCount = mine.documents.length;

  const submit = async () => {
    setSending(true);
    try {
      await send({ listingId: listing._id, message: message.trim() || undefined });
      Alert.alert('Dossier envoyé', 'Dossier envoyé au propriétaire.');
      router.back();
    } catch {
      Alert.alert('Échec', "Impossible d'envoyer le dossier. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">{listing.title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            Le propriétaire reçoit une notification et un lien privé vers votre dossier, valable 30
            jours.
          </ThemedText>

          {documentCount === 0 ? (
            <View style={styles.block}>
              <ThemedText>
                Votre dossier est vide. Ajoutez au moins un justificatif avant de l&apos;envoyer.
              </ThemedText>
              <Button label="Préparer mon dossier" primary onPress={() => router.push('/me/dossier')} />
            </View>
          ) : (
            <View style={styles.block}>
              <ThemedText>
                {documentCount === 1
                  ? '1 document sera partagé.'
                  : `${documentCount} documents seront partagés.`}
              </ThemedText>
              <Button label="Modifier mon dossier" onPress={() => router.push('/me/dossier')} />

              <ThemedText type="smallBold">Message au propriétaire (facultatif)</ThemedText>
              <TextInput
                style={[styles.textarea, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="Bonjour, votre annonce m'intéresse beaucoup…"
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={MAX_MESSAGE}
                textAlignVertical="top"
                value={message}
                onChangeText={setMessage}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Vous pourrez retirer l&apos;accès à tout moment depuis votre espace personnel.
              </ThemedText>
              <Button label="Envoyer" primary loading={sending} onPress={submit} />
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: Spacing.five },
  content: { padding: Spacing.three, gap: Spacing.three },
  block: { gap: Spacing.two },
  textarea: {
    minHeight: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
  },
});
