import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AuthorLink } from '@/components/author-link';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ActionRow, Banner, CenteredMessage, LoadingScreen, PendingBanner, Section, SectionTitle } from '@/components/detail';
import { Gallery } from '@/components/gallery';
import { Icon, type IconName } from '@/components/icon';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerCategoryLabels, serviceModeLabels } from '@/lib/provider-labels';
import { safeExternalUrl, webUrl } from '@/lib/web';

export default function ProviderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const theme = useTheme();
  const provider = useQuery(api.providers.queries.getProviderBySlug, { slug });

  if (provider === undefined) return <LoadingScreen />;
  if (provider === null) {
    return (
      <CenteredMessage
        icon="storefront-outline"
        title="Prestataire introuvable"
        description="Cette page a peut-être été retirée ou n'est plus visible."
      />
    );
  }

  const whatsappText = encodeURIComponent(`Bonjour ${provider.name}, je vous ai trouvé sur HalloMada 👋`);
  const links: { label: string; icon: IconName; url: string | null }[] = [
    { label: 'Site web', icon: 'globe-outline', url: safeExternalUrl(provider.website) },
    { label: 'Facebook', icon: 'logo-facebook', url: safeExternalUrl(provider.facebook) },
    { label: 'Instagram', icon: 'logo-instagram', url: safeExternalUrl(provider.instagram) },
    { label: 'TikTok', icon: 'logo-tiktok', url: safeExternalUrl(provider.tiktok) },
  ];

  const share = () => {
    const url = webUrl(`/providers/${provider.slug}`);
    void Share.share(url ? { message: `${provider.name}\n${url}`, url } : { message: provider.name });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: providerCategoryLabels[provider.category] }} />
      <ScrollView>
        {provider.images.length ? (
          <Gallery urls={provider.images.map((image) => image.url)} />
        ) : (
          <View style={[styles.coverFallback, { backgroundColor: theme.primarySoft }]}>
            <Icon name="storefront-outline" size={40} themeColor="primaryText" />
          </View>
        )}
        <View style={styles.content}>
          {provider.status === 'pending' ? (
            <PendingBanner
              title="En attente de validation"
              description="Votre page sera visible publiquement dès qu'un administrateur l'aura validée."
            />
          ) : provider.status === 'rejected' ? (
            <Banner tone="danger" icon="close-circle-outline" title="Page refusée" description="Modifiez-la puis renvoyez-la en validation." />
          ) : null}

          <Card style={styles.hero}>
            <View style={styles.heroTop}>
              {provider.logoUrl ? (
                <Image source={provider.logoUrl} style={[styles.logo, { backgroundColor: theme.muted }]} contentFit="cover" />
              ) : (
                <Avatar name={provider.name} size={64} />
              )}
              <View style={styles.flex}>
                <ThemedText type="subtitle">{provider.name}</ThemedText>
                {provider.tagline ? <ThemedText themeColor="textSecondary">{provider.tagline}</ThemedText> : null}
              </View>
            </View>
            <View style={styles.badges}>
              <Badge label={providerCategoryLabels[provider.category]} tone="primary" icon="pricetag-outline" />
              <Badge label={provider.city} tone="info" icon="location-outline" />
              {provider.serviceModes.map((mode) => (
                <Badge key={mode} label={serviceModeLabels[mode]} />
              ))}
            </View>
            <AuthorLink
              prefix="Créée par"
              name={provider.isAuthor ? 'vous' : (provider.authorName ?? 'Membre')}
              slug={provider.authorSlug}
            />
          </Card>

          {provider.canManage ? (
            <Button
              label="Modifier ma page"
              icon="create-outline"
              size="md"
              primary
              onPress={() => router.push({ pathname: '/providers/edit/[slug]', params: { slug: provider.slug } })}
            />
          ) : null}

          <Card style={styles.block}>
            <SectionTitle title="Contacter" icon="chatbubble-ellipses-outline" />
            <Button
              label="Écrire sur WhatsApp"
              icon="logo-whatsapp"
              size="md"
              primary
              onPress={() =>
                Linking.openURL(`https://wa.me/${provider.whatsapp.replace(/\D/g, '')}?text=${whatsappText}`)
              }
            />
            <View style={styles.badges}>
              {provider.phone ? (
                <Button label="Appeler" icon="call-outline" variant="outline" onPress={() => Linking.openURL(`tel:${provider.phone}`)} />
              ) : null}
              {provider.email ? (
                <Button label="E-mail" icon="mail-outline" variant="outline" onPress={() => Linking.openURL(`mailto:${provider.email}`)} />
              ) : null}
              {links.map((link) =>
                link.url ? (
                  <Button
                    key={link.label}
                    label={link.label}
                    icon={link.icon}
                    variant="outline"
                    onPress={() => Linking.openURL(link.url!)}
                  />
                ) : null,
              )}
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              Mentionnez HalloMada quand vous contactez ce prestataire.
            </ThemedText>
          </Card>

          <ActionRow>
            <Button label="Partager" icon="share-outline" onPress={share} />
            {provider.isAuthor ? null : <ReportButton type="provider" id={provider._id} title={provider.name} />}
          </ActionRow>

          <Section title="À propos" icon="information-circle-outline" body={provider.description} />

          {provider.services.length ? (
            <View style={styles.block}>
              <SectionTitle title="Services & tarifs" icon="pricetags-outline" />
              <Card padded={false}>
                {provider.services.map((service, index) => (
                  <View
                    key={`${service.name}-${index}`}
                    style={[
                      styles.service,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                    ]}>
                    <ThemedText type="small" style={styles.flex}>
                      {service.name}
                    </ThemedText>
                    {service.price ? (
                      <ThemedText type="smallBold" themeColor="primaryText">
                        {service.price}
                      </ThemedText>
                    ) : null}
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  coverFallback: { height: 140, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: Spacing.three },
  heroTop: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: Radius.full },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  block: { gap: Spacing.two },
  service: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
  },
});
