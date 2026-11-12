import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CenteredMessage, FactList, Section } from '@/components/detail';
import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/job-labels';
import { openWebPath } from '@/lib/routes';
import { openWeb } from '@/lib/web';

const activityKindLabels = { job: 'Offre d’emploi', listing: 'Annonce', post: 'Publication' } as const;

const userStatusLabels: Record<string, string> = {
  looking_for_job: 'Ouvert aux opportunités',
  on_sabbatical: 'En sabbatique',
  inactive: 'Profil inactif',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const profile = useQuery(api.auth.users.getUserBySlug, { slug });
  const currentUser = useQuery(api.auth.auth.getCurrentUser);
  const activity = useQuery(
    api.me.queries.getPublicActivity,
    profile ? { userId: profile._id } : 'skip',
  );

  if (profile === undefined) return <ActivityIndicator style={styles.loader} />;
  if (profile === null) {
    return (
      <CenteredMessage
        title="Profil introuvable"
        description="Ce profil n'existe pas, a été supprimé ou est privé."
      />
    );
  }

  const isOwn = currentUser?._id === profile._id;
  const place = [profile.city, profile.country].filter(Boolean).join(', ');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: profile.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {profile.coverImage ? (
          <Image source={profile.coverImage} style={styles.cover} contentFit="cover" />
        ) : null}
        <View style={styles.header}>
          {profile.image ? (
            <Image source={profile.image} style={styles.avatar} contentFit="cover" />
          ) : (
            <ThemedView type="backgroundElement" style={styles.avatar}>
              <ThemedText type="subtitle">{profile.name.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>
          )}
          <View style={styles.headerText}>
            <ThemedText type="subtitle">{profile.name}</ThemedText>
            {profile.headline ? <ThemedText>{profile.headline}</ThemedText> : null}
            <ThemedText type="small" themeColor="textSecondary">
              @{profile.slug}
              {place ? ` · ${place}` : ''}
            </ThemedText>
            {profile.isServiceProvider ? (
              <ThemedText type="small" themeColor="textSecondary">
                Prestataire de services
              </ThemedText>
            ) : null}
          </View>
        </View>

        {isOwn ? (
          <View style={styles.actions}>
            {!profile.isPublic ? (
              <ThemedText type="small" themeColor="textSecondary">
                Votre profil est privé : vous seul le voyez.
              </ThemedText>
            ) : null}
            <Button label="Modifier le profil" onPress={() => openWeb(`/hl/${profile.slug}`)} />
          </View>
        ) : null}

        {profile.status && userStatusLabels[profile.status] ? (
          <ThemedText type="smallBold">{userStatusLabels[profile.status]}</ThemedText>
        ) : null}

        {profile.bio ? <Section title="À propos" body={profile.bio} /> : null}

        <FactList
          facts={[
            ['Entreprise', profile.company],
            ['Domaine', profile.field ?? profile.industry],
            [
              'Expérience',
              profile.experienceYears ? `${profile.experienceYears} ans d'expérience` : undefined,
            ],
            ['En Allemagne depuis', profile.arrivalDate ? formatDate(profile.arrivalDate) : undefined],
            ['E-mail', profile.showEmail ? profile.email : undefined],
          ]}
        />

        {profile.roles?.length ? <Section title="Rôles" body={profile.roles.join(' · ')} /> : null}
        {profile.skills?.length ? (
          <Section title="Compétences" body={profile.skills.join(' · ')} />
        ) : null}
        {profile.journey?.length ? (
          <Section title="Parcours" body={profile.journey.map((step) => `• ${step}`).join('\n')} />
        ) : null}

        {activity?.length ? (
          <View style={styles.actions}>
            <ThemedText type="smallBold">Contenus actifs</ThemedText>
            {activity.map((item) => (
              <ListRow
                key={item.href}
                title={item.title}
                subtitle={activityKindLabels[item.kind]}
                onPress={() => openWebPath(router, item.href)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: Spacing.five },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  cover: { width: '100%', aspectRatio: 4, borderRadius: Spacing.three, backgroundColor: '#8884' },
  header: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  headerText: { flex: 1, gap: Spacing.one },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8884',
  },
  actions: { gap: Spacing.two },
});
