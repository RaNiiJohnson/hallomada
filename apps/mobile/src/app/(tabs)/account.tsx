import { api } from '@convex/_generated/api';
import { AuthLoading, Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { type Href, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import type { IconName } from '@/components/icon';
import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
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
            <ScreenHeader title="Compte" />
            <ActivityIndicator style={styles.loader} />
          </AuthLoading>
          <Unauthenticated>
            <ScreenHeader title="Compte" subtitle="Connectez-vous pour publier, postuler et suivre vos favoris." />
            <SignInForm />
            <AboutGroup />
          </Unauthenticated>
          <Authenticated>
            <PersonalSpace />
          </Authenticated>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type Entry = { title: string; icon: IconName; subtitle?: string; highlighted?: boolean; onPress: () => void };

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.groupTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function Rows({ entries }: { entries: Entry[] }) {
  return entries.map((entry) => (
    <ListRow
      key={entry.title}
      icon={entry.icon}
      title={entry.title}
      subtitle={entry.subtitle}
      highlighted={entry.highlighted}
      onPress={entry.onPress}
    />
  ));
}

function AboutGroup() {
  const entries: Entry[] = [
    { title: 'Questions fréquentes', icon: 'help-circle-outline', onPress: () => openWeb('/faq') },
    { title: 'Nous contacter', icon: 'mail-outline', onPress: () => openWeb('/contact') },
    { title: 'Conditions d’utilisation', icon: 'document-text-outline', onPress: () => openWeb('/terms') },
    { title: 'Confidentialité', icon: 'shield-checkmark-outline', onPress: () => openWeb('/privacy') },
    { title: 'Mentions légales', icon: 'information-circle-outline', onPress: () => openWeb('/legal-notice') },
  ];
  return (
    <Group title="À propos">
      <Rows entries={entries} />
    </Group>
  );
}

function PersonalSpace() {
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const unread = useQuery(api.notifications.queries.getUnreadCount);

  if (user === undefined) return <ActivityIndicator style={styles.loader} />;
  const go = (href: Href) => () => router.push(href);

  const activity: Entry[] = [
    {
      title: 'Notifications',
      icon: 'notifications-outline',
      subtitle: unread ? `${unread >= 100 ? '99+' : unread} non lue(s)` : undefined,
      highlighted: Boolean(unread),
      onPress: go('/me/notifications'),
    },
    { title: 'Favoris', icon: 'bookmark-outline', onPress: go('/me/favorites') },
    { title: 'Mes candidatures', icon: 'paper-plane-outline', onPress: go('/me/applications') },
    { title: 'Mes publications', icon: 'albums-outline', subtitle: 'Offres et annonces', onPress: go('/me/publications') },
    { title: 'Mes communautés', icon: 'people-outline', subtitle: 'Communautés et publications', onPress: go('/me/communities') },
    { title: 'Mes pages prestataire', icon: 'storefront-outline', onPress: go('/me/providers') },
  ];

  const profile: Entry[] = [
    { title: 'Modifier mon profil', icon: 'person-outline', subtitle: 'Photo, bio, CV', onPress: go('/me/profile') },
    { title: 'Dossier de location', icon: 'folder-open-outline', onPress: go('/me/dossier') },
    ...(user?.slug
      ? [
          {
            title: 'Voir mon profil public',
            icon: 'eye-outline' as const,
            onPress: go({ pathname: '/profiles/[slug]', params: { slug: user.slug } }),
          },
        ]
      : []),
  ];

  const signOut = () =>
    Alert.alert('Se déconnecter ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void requireAuthClient().signOut() },
    ]);

  return (
    <View style={styles.space}>
      <Card style={styles.profile} onPress={go('/me/profile')} accessibilityLabel="Modifier mon profil">
        <Avatar uri={user?.image} name={user?.name} size={64} />
        <View style={styles.flex}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {user?.name ?? 'Mon espace'}
          </ThemedText>
          {user ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {user.email}
            </ThemedText>
          ) : null}
          {user && !user.emailVerified ? (
            <View style={styles.badge}>
              <Badge label="E-mail non vérifié" tone="warning" icon="alert-circle-outline" />
            </View>
          ) : null}
        </View>
      </Card>
      {user && !user.emailVerified ? (
        <ListRow
          icon="mail-unread-outline"
          title="Vérifier mon adresse e-mail"
          subtitle="Nécessaire pour voir certaines coordonnées"
          onPress={() => openWeb('/verify-email')}
        />
      ) : null}

      <Group title="Mon activité">
        <Rows entries={activity} />
      </Group>
      <Group title="Profil">
        <Rows entries={profile} />
      </Group>
      <AboutGroup />
      <ListRow icon="log-out-outline" title="Se déconnecter" destructive onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: { padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.four },
  loader: { marginTop: Spacing.four },
  space: { gap: Spacing.four, paddingTop: Spacing.three },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  badge: { flexDirection: 'row', marginTop: Spacing.one },
  group: { gap: Spacing.two },
  groupTitle: { letterSpacing: 0.8, marginLeft: Spacing.one },
  rows: { gap: Spacing.two },
});
