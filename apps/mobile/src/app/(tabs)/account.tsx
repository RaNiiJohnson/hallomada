import { api } from '@convex/_generated/api';
import { AuthLoading, Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SignInForm } from '@/components/sign-in-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
      <View style={styles.signOut}>
        <Button label="Se déconnecter" onPress={() => requireAuthClient().signOut()} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.three, gap: Spacing.four },
  loader: { marginTop: Spacing.four },
  profile: { gap: Spacing.two },
  signOut: { marginTop: Spacing.three },
});
