import { api } from '@convex/_generated/api';
import { AuthLoading, Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignInForm } from '@/components/sign-in-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requireAuthClient } from '@/lib/backend';

export default function AccountScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Compte</ThemedText>
        <AuthLoading>
          <ActivityIndicator style={styles.loader} />
        </AuthLoading>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
        <Authenticated>
          <Profile />
        </Authenticated>
      </SafeAreaView>
    </ThemedView>
  );
}

function Profile() {
  const theme = useTheme();
  const user = useQuery(api.auth.auth.getCurrentUser);

  if (user === undefined) return <ActivityIndicator style={styles.loader} />;

  return (
    <ThemedView style={styles.profile}>
      {user ? (
        <>
          <ThemedText type="subtitle">{user.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{user.email}</ThemedText>
        </>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => requireAuthClient().signOut()}
        style={({ pressed }) => [
          styles.signOut,
          { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
        ]}>
        <ThemedText type="smallBold">Se déconnecter</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.three, gap: Spacing.four },
  loader: { marginTop: Spacing.four },
  profile: { gap: Spacing.two },
  signOut: {
    marginTop: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    minHeight: 48,
  },
});
