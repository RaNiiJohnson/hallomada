import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Share, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ActionRow, Banner, CenteredMessage, FactList, LoadingScreen, Section, SectionTitle } from '@/components/detail';
import type { IconName } from '@/components/icon';
import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/job-labels';
import { openWebPath } from '@/lib/routes';
import { webUrl } from '@/lib/web';

const activityKinds: Record<'job' | 'listing' | 'post', { label: string; icon: IconName }> = {
  job: { label: 'Offre d’emploi', icon: 'briefcase-outline' },
  listing: { label: 'Annonce', icon: 'home-outline' },
  post: { label: 'Publication', icon: 'chatbubbles-outline' },
};

const userStatusLabels: Record<string, string> = {
  looking_for_job: 'Ouvert aux opportunités',
  on_sabbatical: 'En sabbatique',
  inactive: 'Profil inactif',
};

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const profile = useQuery(api.auth.users.getUserBySlug, { slug });
  const currentUser = useQuery(api.auth.auth.getCurrentUser);
  const activity = useQuery(api.me.queries.getPublicActivity, profile ? { userId: profile._id } : 'skip');

  if (profile === undefined) return <LoadingScreen />;
  if (profile === null) {
    return (
      <CenteredMessage
        icon="person-outline"
        title="Profil introuvable"
        description="Ce profil n'existe pas, a été supprimé ou est privé."
      />
    );
  }

  const isOwn = currentUser?._id === profile._id;
  const place = [profile.city, profile.country].filter(Boolean).join(', ');
  const share = () => {
    const url = webUrl(`/hl/${profile.slug}`);
    void Share.share(url ? { message: `${profile.name}\n${url}`, url } : { message: profile.name });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: profile.name }} />
      <ScrollView>
        {profile.coverImage ? (
          <Image source={profile.coverImage} style={[styles.cover, { backgroundColor: theme.muted }]} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: theme.primarySoft }]} />
        )}
        <View style={styles.content}>
          <Card style={styles.hero}>
            <View style={[styles.avatarRing, { backgroundColor: theme.card }]}>
              <Avatar uri={profile.image} name={profile.name} size={80} />
            </View>
            <View style={styles.heroText}>
              <ThemedText type="subtitle">{profile.name}</ThemedText>
              {profile.headline ? <ThemedText themeColor="textSecondary">{profile.headline}</ThemedText> : null}
              <ThemedText type="small" themeColor="textSecondary">
                @{profile.slug}
              </ThemedText>
            </View>
            <View style={styles.badges}>
              {place ? <Badge label={place} tone="info" icon="location-outline" /> : null}
              {profile.status && userStatusLabels[profile.status] ? (
                <Badge
                  label={userStatusLabels[profile.status]}
                  tone={profile.status === 'looking_for_job' ? 'primary' : 'neutral'}
                  icon="sparkles-outline"
                />
              ) : null}
              {profile.isServiceProvider ? <Badge label="Prestataire" tone="warning" icon="storefront-outline" /> : null}
            </View>
          </Card>

          {isOwn && !profile.isPublic ? (
            <Banner
              tone="info"
              icon="lock-closed-outline"
              title="Profil privé"
              description="Vous seul voyez cette page. Rendez-la publique depuis Modifier mon profil."
            />
          ) : null}

          <ActionRow>
            {isOwn ? (
              <Button label="Modifier" icon="create-outline" primary onPress={() => router.push('/me/profile')} />
            ) : null}
            <Button label="Partager" icon="share-outline" onPress={share} />
          </ActionRow>

          {profile.bio ? <Section title="À propos" icon="person-circle-outline" body={profile.bio} /> : null}

          <FactList
            facts={[
              ['Entreprise', profile.company],
              ['Domaine', profile.field ?? profile.industry],
              ['Expérience', profile.experienceYears ? `${profile.experienceYears} ans` : undefined],
              ['En Allemagne depuis', profile.arrivalDate ? formatDate(profile.arrivalDate) : undefined],
              ['E-mail', profile.showEmail ? profile.email : undefined],
            ]}
          />

          {profile.roles?.length ? <ChipSection title="Rôles" icon="ribbon-outline" items={profile.roles} /> : null}
          {profile.skills?.length ? (
            <ChipSection title="Compétences" icon="construct-outline" items={profile.skills} />
          ) : null}

          {profile.journey?.length ? (
            <View style={styles.block}>
              <SectionTitle title="Parcours" icon="trail-sign-outline" />
              <Card style={styles.block}>
                {profile.journey.map((step, index) => (
                  <View key={`${step}-${index}`} style={styles.step}>
                    <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                    <ThemedText type="small" style={styles.flex}>
                      {step}
                    </ThemedText>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          {activity?.length ? (
            <View style={styles.block}>
              <SectionTitle title="Contenus actifs" icon="albums-outline" />
              {activity.map((item) => (
                <ListRow
                  key={item.href}
                  icon={activityKinds[item.kind].icon}
                  title={item.title}
                  subtitle={activityKinds[item.kind].label}
                  onPress={() => openWebPath(router, item.href)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function ChipSection({ title, icon, items }: { title: string; icon: IconName; items: string[] }) {
  return (
    <View style={styles.block}>
      <SectionTitle title={title} icon={icon} />
      <View style={styles.badges}>
        {items.map((item) => (
          <Badge key={item} label={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  cover: { width: '100%', height: 140 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: { marginTop: -Spacing.six, gap: Spacing.three },
  avatarRing: { alignSelf: 'flex-start', padding: 4, borderRadius: Radius.full, marginTop: -Spacing.six },
  heroText: { gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  block: { gap: Spacing.two },
  step: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
});
