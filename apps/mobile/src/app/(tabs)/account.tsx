import { api } from '@convex/_generated/api';
import { AuthLoading, Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { type Href, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { SignInForm } from '@/components/sign-in-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { requireAuthClient } from '@/lib/backend';
import { openWeb } from '@/lib/web';

export default function AccountScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthLoading>
            <ThemedText type="title">Compte</ThemedText>
            <ActivityIndicator style={styles.loader} />
          </AuthLoading>
          <Unauthenticated>
            <ThemedText type="title">Compte</ThemedText>
            <SignInForm />
          </Unauthenticated>
          <Authenticated>
            <PersonalSpace />
          </Authenticated>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PersonalSpace() {
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const unread = useQuery(api.notifications.queries.getUnreadCount);

  if (user === undefined) return <ActivityIndicator style={styles.loader} />;

  const entries: { title: string; subtitle?: string; href: Href }[] = [
    {
      title: 'Notifications',
      subtitle: unread ? `${unread >= 100 ? '99+' : unread} non lue(s)` : undefined,
      href: '/me/notifications',
    },
    { title: 'Favoris', href: '/me/favorites' },
    { title: 'Mes candidatures', href: '/me/applications' },
    { title: 'Mes publications', href: '/me/publications' },
  ];

  return (
    <View style={styles.space}>
      <View style={styles.header}>
        <ThemedText type="title">{user?.name ?? 'Mon espace'}</ThemedText>
        {user ? <ThemedText themeColor="textSecondary">{user.email}</ThemedText> : null}
        {user && !user.emailVerified ? (
          <ThemedText type="small" themeColor="textSecondary">
            Adresse e-mail non vérifiée : certaines coordonnées restent masquées.
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.entries}>
        {entries.map((entry) => (
          <ListRow
            key={entry.title}
            title={entry.title}
            subtitle={entry.subtitle}
            highlighted={entry.href === '/me/notifications' && Boolean(unread)}
            onPress={() => router.push(entry.href)}
          />
        ))}
        {user?.slug ? (
          <ListRow
            title="Mon profil public"
            onPress={() =>
              router.push({ pathname: '/profiles/[slug]', params: { slug: user.slug! } })
            }
          />
        ) : null}
        <ListRow title="Dossier de location" subtitle="Sur le site" onPress={() => openWeb('/me?tab=dossier')} />
        <ListRow title="Modifier mon profil" subtitle="Sur le site" onPress={() => openWeb('/me')} />
      </View>

      <Button label="Se déconnecter" onPress={() => requireAuthClient().signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.three, gap: Spacing.four },
  loader: { marginTop: Spacing.four },
  space: { gap: Spacing.four },
  header: { gap: Spacing.one },
  entries: { gap: Spacing.two },
});
