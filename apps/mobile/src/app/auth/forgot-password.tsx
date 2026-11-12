import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { requireAuthClient } from '@/lib/backend';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const authClient = requireAuthClient();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresse e-mail invalide.');
      return;
    }
    setPending(true);
    setError(null);
    // The reset link opens the website's reset page; the new password then
    // works in the app too.
    const { error } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: '/fr/reset-password',
    });
    setPending(false);
    if (error) setError(error.message ?? "Échec de l'envoi du lien.");
    else setSent(true);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {sent ? (
          <>
            <ThemedText type="subtitle">Vérifiez votre e-mail</ThemedText>
            <ThemedText>Nous vous avons envoyé un lien de réinitialisation.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Vous ne voyez pas l&apos;e-mail ? Pensez à vérifier votre dossier spam.
            </ThemedText>
            <Button label="Se connecter" primary onPress={() => router.back()} />
            <Button label="Réessayer" onPress={() => setSent(false)} />
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              Entrez votre e-mail pour recevoir les instructions.
            </ThemedText>
            <FormField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="nom@exemple.com"
              onSubmitEditing={submit}
            />
            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
            <Button
              label="Envoyer les instructions"
              primary
              loading={pending}
              disabled={pending}
              onPress={submit}
            />
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  error: { color: '#E5484D' },
});
