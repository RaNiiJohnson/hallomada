import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requireAuthClient } from '@/lib/backend';

const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;

type Pending = 'email' | 'google' | null;

export function SignInForm() {
  const theme = useTheme();
  const authClient = requireAuthClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWithEmail() {
    setPending('email');
    setError(null);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    if (error) {
      setError(
        error.code === 'EMAIL_NOT_VERIFIED'
          ? 'Confirme ton adresse e-mail avant de te connecter.'
          : 'E-mail ou mot de passe incorrect.',
      );
    }
    setPending(null);
  }

  async function signInWithGoogle() {
    setPending('google');
    setError(null);
    // The Expo plugin opens the browser and turns "/" into a hallomada:// deep link.
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    if (error) setError('Connexion Google impossible. Réessaie.');
    setPending(null);
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text },
  ];

  return (
    <View style={styles.form}>
      <TextInput
        style={inputStyle}
        placeholder="E-mail"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={inputStyle}
        placeholder="Mot de passe"
        placeholderTextColor={theme.textSecondary}
        autoComplete="current-password"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={signInWithEmail}
      />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <Button
        label="Se connecter"
        loading={pending === 'email'}
        disabled={pending !== null || !email || !password}
        onPress={signInWithEmail}
        primary
      />
      <Button
        label="Continuer avec Google"
        loading={pending === 'google'}
        disabled={pending !== null}
        onPress={signInWithGoogle}
      />

      {siteUrl ? (
        <Pressable onPress={() => WebBrowser.openBrowserAsync(`${siteUrl}/fr/register`)}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.register}>
            Pas encore de compte ? Inscris-toi sur Hallomada.
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  error: { color: '#E5484D' },
  register: { textAlign: 'center' },
});
