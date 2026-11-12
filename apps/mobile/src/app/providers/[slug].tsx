import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AuthorLink } from '@/components/author-link';
import { Button } from '@/components/button';
import { CenteredMessage, PendingBanner, Section } from '@/components/detail';
import { Gallery } from '@/components/gallery';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { providerCategoryLabels, serviceModeLabels } from '@/lib/provider-labels';
import { openWeb, safeExternalUrl, webUrl } from '@/lib/web';

export default function ProviderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const provider = useQuery(api.providers.queries.getProviderBySlug, { slug });

  if (provider === undefined) return <ActivityIndicator style={styles.loader} />;
  if (provider === null) {
    return (
      <CenteredMessage
        title="Prestataire introuvable"
        description="Cette page a peut-être été retirée ou n'est plus visible."
      />
    );
  }

  const whatsappText = encodeURIComponent(
    `Bonjour ${provider.name}, je vous ai trouvé sur HalloMada 👋`,
  );
  const links: { label: string; url: string | null }[] = [
    { label: 'Site web', url: safeExternalUrl(provider.website) },
    { label: 'Facebook', url: safeExternalUrl(provider.facebook) },
    { label: 'Instagram', url: safeExternalUrl(provider.instagram) },
    { label: 'TikTok', url: safeExternalUrl(provider.tiktok) },
  ];

  const share = () => {
    const url = webUrl(`/providers/${provider.slug}`);
    void Share.share(url ? { message: `${provider.name}\n${url}`, url } : { message: provider.name });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: providerCategoryLabels[provider.category] }} />
      <ScrollView>
        <Gallery urls={provider.images.map((image) => image.url)} />
        <View style={styles.content}>
          {provider.status === 'pending' ? (
            <PendingBanner
              title="En attente de validation"
              description="Votre page sera visible publiquement dès qu'un administrateur l'aura validée."
            />
          ) : null}

          <View style={styles.header}>
            {provider.logoUrl ? (
              <Image source={provider.logoUrl} style={styles.logo} contentFit="cover" />
            ) : null}
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{provider.name}</ThemedText>
              {provider.tagline ? <ThemedText>{provider.tagline}</ThemedText> : null}
              <ThemedText type="small" themeColor="textSecondary">
                {providerCategoryLabels[provider.category]} · {provider.city}
              </ThemedText>
              <AuthorLink
                prefix="Créée par"
                name={provider.isAuthor ? 'vous' : (provider.authorName ?? 'Membre')}
                slug={provider.authorSlug}
              />
            </View>
          </View>

          {provider.serviceModes.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {provider.serviceModes.map((mode) => serviceModeLabels[mode]).join(' · ')}
            </ThemedText>
          ) : null}

          <View style={styles.actions}>
            <ThemedText type="smallBold">Contacter</ThemedText>
            <Button
              label="Écrire sur WhatsApp"
              primary
              onPress={() =>
                Linking.openURL(`https://wa.me/${provider.whatsapp.replace(/\D/g, '')}?text=${whatsappText}`)
              }
            />
            {provider.phone ? (
              <Button label="Appeler" onPress={() => Linking.openURL(`tel:${provider.phone}`)} />
            ) : null}
            {provider.email ? (
              <Button label="E-mail" onPress={() => Linking.openURL(`mailto:${provider.email}`)} />
            ) : null}
            {links.map((link) =>
              link.url ? (
                <Button key={link.label} label={link.label} onPress={() => Linking.openURL(link.url!)} />
              ) : null,
            )}
            <ThemedText type="small" themeColor="textSecondary">
              Mentionnez HalloMada quand vous contactez ce prestataire.
            </ThemedText>
          </View>

          <Section title="À propos" body={provider.description} />

          {provider.services.length ? (
            <View style={styles.services}>
              <ThemedText type="smallBold">Services & tarifs</ThemedText>
              <ThemedView type="backgroundElement" style={styles.card}>
                {provider.services.map((service, index) => (
                  <View key={`${service.name}-${index}`} style={styles.service}>
                    <ThemedText type="small" style={styles.serviceName}>
                      {service.name}
                    </ThemedText>
                    {service.price ? <ThemedText type="smallBold">{service.price}</ThemedText> : null}
                  </View>
                ))}
              </ThemedView>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button label="Partager" onPress={share} />
            {provider.canManage ? (
              <Button label="Modifier" onPress={() => openWeb(`/providers/${provider.slug}/edit`)} />
            ) : null}
          </View>
        </View>
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
  header: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  headerText: { flex: 1, gap: Spacing.one },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#8884' },
  actions: { gap: Spacing.two },
  services: { gap: Spacing.two },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  service: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  serviceName: { flex: 1 },
});
