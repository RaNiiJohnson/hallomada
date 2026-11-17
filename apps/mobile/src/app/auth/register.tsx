import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { requireAuthClient } from '@/lib/backend';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const authClient = requireAuthClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function validate() {
    if (name.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères.';
    if (!EMAIL_PATTERN.test(email.trim())) return 'Adresse e-mail invalide.';
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (password !== confirm) return 'Les mots de passe ne correspondent pas.';
    return null;
  }

  async function submit() {
    const invalid = validate();
    setError(invalid);
    if (invalid) return;
    setPending(true);
    const { error } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
      // The Expo plugin turns "/" into a hallomada:// link, so the verification
      // e-mail brings the user back to the app.
      callbackURL: '/',
    });
    setPending(false);
    if (error) {
      setError(
        error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
          ? 'Un compte existe déjà avec cette adresse e-mail.'
          : (error.message ?? 'Inscription échouée.'),
      );
      return;
    }
    setSentTo(email.trim());
  }

  async function resend() {
    if (!sentTo) return;
    setPending(true);
    await authClient.sendVerificationEmail({ email: sentTo, callbackURL: '/' });
    setPending(false);
  }

  if (sentTo) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Vérifiez votre e-mail</ThemedText>
          <ThemedText>
            Un e-mail de vérification a été envoyé à {sentTo}. Cliquez sur le lien pour activer votre
            compte, puis connectez-vous.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Vous ne voyez pas l&apos;e-mail ? Pensez à vérifier votre dossier spam.
          </ThemedText>
          <Button label="Se connecter" primary onPress={() => router.back()} />
          <Button label="Renvoyer l'e-mail" loading={pending} onPress={resend} />
        </View>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary">
            Rejoignez la communauté et publiez vos annonces.
          </ThemedText>
          <FormField label="Nom" value={name} onChangeText={setName} autoComplete="name" placeholder="Dupont" />
          <FormField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="nom@exemple.com"
          />
          <FormField
            label="Mot de passe"
            hint="8 caractères minimum."
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <FormField
            label="Confirmer le mot de passe"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
          />
          {error ? <ThemedText type="small" themeColor="destructive">{error}</ThemedText> : null}
          <Button label="Créer un compte" primary loading={pending} disabled={pending} onPress={submit} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            En créant un compte, vous acceptez les conditions d&apos;utilisation et la politique de
            confidentialité.
          </ThemedText>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  center: { textAlign: 'center' },
});
