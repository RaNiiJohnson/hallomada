import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requireAuthClient } from '@/lib/backend';

type Pending = 'email' | 'google' | 'resend' | null;

export function SignInForm() {
  const theme = useTheme();
  const router = useRouter();
  const authClient = requireAuthClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  async function signInWithEmail() {
    setPending('email');
    setError(null);
    setUnverified(false);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    if (error) {
      const notVerified = error.code === 'EMAIL_NOT_VERIFIED';
      setUnverified(notVerified);
      setError(
        notVerified
          ? 'Confirmez votre adresse e-mail avant de vous connecter.'
          : 'E-mail ou mot de passe incorrect.',
      );
    }
    setPending(null);
  }

  async function resendVerification() {
    setPending('resend');
    const { error } = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: '/' });
    setError(error ? "Impossible d'envoyer l'e-mail. Réessayez." : 'E-mail de vérification renvoyé.');
    setUnverified(false);
    setPending(null);
  }

  async function signInWithGoogle() {
    setPending('google');
    setError(null);
    // The Expo plugin opens the browser and turns "/" into a hallomada:// deep link.
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    if (error) setError('Connexion Google impossible. Réessayez.');
    setPending(null);
  }

  return (
    <Card style={styles.form}>
      <FormField
        label="E-mail"
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <FormField
        label="Mot de passe"
        placeholder="••••••••"
        autoComplete="current-password"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={signInWithEmail}
      />
      <Pressable onPress={() => router.push('/auth/forgot-password')} style={styles.forgot}>
        <ThemedText type="linkPrimary">Mot de passe oublié ?</ThemedText>
      </Pressable>

      {error ? (
        <ThemedText type="small" themeColor="destructive">
          {error}
        </ThemedText>
      ) : null}
      {unverified ? (
        <Button
          label="Renvoyer l'e-mail de vérification"
          variant="outline"
          icon="mail-outline"
          loading={pending === 'resend'}
          disabled={pending !== null}
          onPress={resendVerification}
        />
      ) : null}

      <Button
        label="Se connecter"
        size="md"
        loading={pending === 'email'}
        disabled={pending !== null || !email || !password}
        onPress={signInWithEmail}
        primary
      />
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <ThemedText type="caption" themeColor="textSecondary">
          ou
        </ThemedText>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>
      <Button
        label="Continuer avec Google"
        variant="outline"
        icon="logo-google"
        size="md"
        loading={pending === 'google'}
        disabled={pending !== null}
        onPress={signInWithGoogle}
      />
      <View style={styles.register}>
        <ThemedText type="small" themeColor="textSecondary">
          Pas encore de compte ?
        </ThemedText>
        <Pressable onPress={() => router.push('/auth/register')}>
          <ThemedText type="linkPrimary">Créer un compte</ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  forgot: { alignSelf: 'flex-end', marginTop: -Spacing.one },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  register: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.one },
});
