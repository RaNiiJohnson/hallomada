import { api } from '@convex/_generated/api';
import { useConvexAuth, usePaginatedQuery, useQuery } from 'convex/react';
import { type Href, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountButton, NotificationsButton } from '@/components/account-button';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { JobCard } from '@/components/job-card';
import { ListingCard } from '@/components/listing-card';
import { PostCard } from '@/components/post-card';
import { ProviderCard } from '@/components/provider-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openWeb } from '@/lib/web';

type Section = {
  href: Href;
  title: string;
  description: string;
  icon: IconName;
};

// Same four services and wording as the web home page (apps/web/messages/fr/home.json).
const sections: Section[] = [
  {
    href: '/communities',
    title: 'Communautés',
    description: 'Entraide et discussions',
    icon: 'people-outline',
  },
  {
    href: '/jobs',
    title: 'Emplois',
    description: 'Jobs, stages, au pair, formations',
    icon: 'briefcase-outline',
  },
  {
    href: '/listings',
    title: 'Immobilier',
    description: 'Logements et colocations',
    icon: 'business-outline',
  },
  {
    href: '/providers',
    title: 'Prestataires',
    description: 'Traiteurs, photographes, coiffeurs…',
    icon: 'storefront-outline',
  },
];

const publishActions: { href: Href; label: string; icon: IconName }[] = [
  { href: '/posts/new', label: 'Une publication', icon: 'chatbubble-ellipses-outline' },
  { href: '/jobs/new', label: 'Une offre d’emploi', icon: 'briefcase-outline' },
  { href: '/listings/new', label: 'Une annonce logement', icon: 'business-outline' },
  { href: '/providers/new', label: 'Ma page prestataire', icon: 'storefront-outline' },
];

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar />
          <Hero />
          <Services />
          <Publish />
          <LatestJobs />
          <LatestListings />
          <LatestPosts />
          <LatestProviders />
          <Footer />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TopBar() {
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.auth.getCurrentUser, isAuthenticated ? {} : 'skip');
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <View style={styles.topBar}>
      <View style={[styles.logo, { backgroundColor: theme.primary }]}>
        <ThemedText style={[styles.logoText, { color: theme.primaryForeground }]}>H</ThemedText>
      </View>
      <View style={styles.flex}>
        <ThemedText type="heading" numberOfLines={1}>
          {firstName ? `Bonjour ${firstName} 👋` : 'Hallomada'}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          La communauté malgache en Allemagne
        </ThemedText>
      </View>
      <NotificationsButton />
      <AccountButton />
    </View>
  );
}

function Hero() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading || isAuthenticated) return null;

  return (
    <View style={styles.hero}>
      <ThemedText style={styles.heroTitle}>Vos communautés.{'\n'}Vos opportunités.</ThemedText>
      <ThemedText themeColor="textSecondary">
        Emploi, logement et entraide entre Malagasy d’Allemagne.
      </ThemedText>
      <View style={styles.heroButtons}>
        <Button label="Rejoindre Hallomada" variant="brand" onPress={() => router.push('/auth/register')} />
        <Button label="J’ai déjà un compte" variant="ghost" onPress={() => router.push('/account')} />
      </View>
    </View>
  );
}

function SectionHeader({ title, action, href }: { title: string; action?: string; href?: Href }) {
  const router = useRouter();
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="heading" style={styles.flex}>
        {title}
      </ThemedText>
      {action && href ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.navigate(href)}
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            {action}
          </ThemedText>
          <Icon name="chevron-forward" size={16} themeColor="textSecondary" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Services() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <SectionHeader title="Explorer" />
      <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {sections.map((section, index) => (
          <Pressable
            key={section.title}
            accessibilityRole="link"
            accessibilityLabel={section.title}
            onPress={() => router.navigate(section.href)}
            style={({ pressed }) => [
              styles.groupRow,
              index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
              pressed && { backgroundColor: theme.muted },
            ]}>
            <Icon name={section.icon} size={22} themeColor="text" />
            <View style={styles.flex}>
              <ThemedText type="smallBold">{section.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {section.description}
              </ThemedText>
            </View>
            <Icon name="chevron-forward" size={18} themeColor="textSecondary" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Publish() {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();

  return (
    <View style={styles.section}>
      <SectionHeader title="Publier" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {publishActions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={() => router.push(isAuthenticated ? action.href : '/account')}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.card, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <Icon name={action.icon} size={18} themeColor="text" />
            <ThemedText type="small">{action.label}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Preview({ loading, empty, children }: { loading: boolean; empty: boolean; children: ReactNode }) {
  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (empty) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Rien pour le moment.
      </ThemedText>
    );
  }
  return children;
}

function LatestJobs() {
  const { results, status } = usePaginatedQuery(api.jobs.queries.getJobs, {}, { initialNumItems: 3 });
  const jobs = results.slice(0, 3);
  return (
    <View style={styles.section}>
      <SectionHeader title="Dernières offres" action="Tout voir" href="/jobs" />
      <Preview loading={status === 'LoadingFirstPage'} empty={jobs.length === 0}>
        <View style={styles.stack}>
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </View>
      </Preview>
    </View>
  );
}

function LatestListings() {
  const { results, status } = usePaginatedQuery(api.listings.queries.getListing, {}, { initialNumItems: 6 });
  return (
    <View style={styles.section}>
      <SectionHeader title="Logements récents" action="Tout voir" href="/listings" />
      <Preview loading={status === 'LoadingFirstPage'} empty={results.length === 0}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {results.slice(0, 6).map((listing) => (
            <View key={listing._id} style={styles.slide}>
              <ListingCard listing={listing} />
            </View>
          ))}
        </ScrollView>
      </Preview>
    </View>
  );
}

function LatestPosts() {
  const feed = useQuery(api.posts.queries.getSortedPosts, { order: 'desc', offset: 0, numItems: 3 });
  return (
    <View style={styles.section}>
      <SectionHeader title="Discussions récentes" action="Tout voir" href="/communities" />
      <Preview loading={feed === undefined} empty={(feed?.posts.length ?? 0) === 0}>
        <View>
          {feed?.posts.map((post, index) => (
            <PostCard key={post._id} post={post} divider={index < feed.posts.length - 1} />
          ))}
        </View>
      </Preview>
    </View>
  );
}

function LatestProviders() {
  const { results, status } = usePaginatedQuery(api.providers.queries.listProviders, {}, { initialNumItems: 6 });
  return (
    <View style={styles.section}>
      <SectionHeader title="Prestataires" action="Tout voir" href="/providers" />
      <Preview loading={status === 'LoadingFirstPage'} empty={results.length === 0}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {results.slice(0, 6).map((provider) => (
            <View key={provider._id} style={styles.providerSlide}>
              <ProviderCard compact provider={provider} />
            </View>
          ))}
        </ScrollView>
      </Preview>
    </View>
  );
}

function Footer() {
  const links: { label: string; path: string }[] = [
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
    { label: 'Conditions', path: '/terms' },
    { label: 'Confidentialité', path: '/privacy' },
  ];
  return (
    <View style={styles.footer}>
      <View style={styles.footerLinks}>
        {links.map((link) => (
          <Pressable key={link.path} hitSlop={6} onPress={() => openWeb(link.path)}>
            <ThemedText type="caption" themeColor="textSecondary">
              {link.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        Emploi · Logement · Prestataires · Entraide
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.five,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.three },
  logo: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 22, lineHeight: 26, fontWeight: 800 },
  hero: { gap: Spacing.three, paddingVertical: Spacing.two },
  heroTitle: { fontSize: 32, lineHeight: 38, fontWeight: 700, letterSpacing: -0.8 },
  heroButtons: { gap: Spacing.one, marginTop: Spacing.two },
  section: { gap: Spacing.three },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  group: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - Spacing.one,
    minHeight: 64,
  },
  chips: { gap: Spacing.two, paddingRight: Spacing.three },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  stack: { gap: Spacing.three },
  carousel: { gap: Spacing.three, paddingRight: Spacing.three, paddingBottom: Spacing.one },
  slide: { width: 260 },
  providerSlide: { width: 230 },
  loader: { marginVertical: Spacing.three },
  footer: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.four },
});
