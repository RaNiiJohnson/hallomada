import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Banner, CenteredMessage, LoadingScreen, PendingBanner } from '@/components/detail';
import { Gallery } from '@/components/gallery';
import { Icon, type IconName } from '@/components/icon';
import { OwnerPanel } from '@/components/owner-panel';
import { ProviderAvatar } from '@/components/provider-card';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { providerCategoryLabels, serviceModeLabels } from '@/lib/provider-labels';
import { safeExternalUrl, webUrl } from '@/lib/web';

const WHATSAPP = '#25D366';
const SHOWCASE_RADIUS = 28;

type Provider = NonNullable<ReturnType<typeof useQuery<typeof api.providers.queries.getProviderBySlug>>>;

export default function ProviderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const provider = useQuery(api.providers.queries.getProviderBySlug, { slug });
  const setProviderStatus = useMutation(api.providers.mutations.setProviderStatus);

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
  const openWhatsApp = () =>
    Linking.openURL(`https://wa.me/${provider.whatsapp.replace(/\D/g, '')}?text=${whatsappText}`);
  const edit = () => router.push({ pathname: '/providers/edit/[slug]', params: { slug: provider.slug } });
  const share = () => {
    const url = webUrl(`/providers/${provider.slug}`);
    void Share.share(url ? { message: `${provider.name}\n${url}`, url } : { message: provider.name });
  };
  const cover = provider.images.find((image) => image.url)?.url;
  const photos = provider.images.map((image) => image.url).filter((url): url is string => Boolean(url));
  const surface = { backgroundColor: theme.card, borderColor: theme.border };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {provider.status === 'pending' ? (
          <PendingBanner
            title="En attente de validation"
            description="Votre page sera visible publiquement dès qu'un administrateur l'aura validée."
          />
        ) : provider.status === 'rejected' ? (
          <Banner tone="danger" icon="close-circle-outline" title="Page refusée" description="Modifiez-la puis renvoyez-la en validation." />
        ) : null}

        {provider.isAuthor ? (
          <OwnerPanel
            noun="page"
            status={provider.status}
            onEdit={edit}
            onSetStatus={(status) => setProviderStatus({ providerId: provider._id, status })}
          />
        ) : provider.canManage ? (
          <Button label="Modifier la page (admin)" icon="create-outline" variant="outline" onPress={edit} />
        ) : null}

        <View style={[styles.showcase, surface]}>
          <View style={[styles.cover, { backgroundColor: `${theme.primary}26` }]}>
            {cover ? <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
          </View>
          <View style={styles.identity}>
            <View style={[styles.avatarRing, { backgroundColor: theme.card }]}>
              <ProviderAvatar name={provider.name} logoUrl={provider.logoUrl} size={88} />
            </View>
            <ThemedText style={styles.name}>{provider.name}</ThemedText>
            {provider.tagline ? <ThemedText themeColor="textSecondary">{provider.tagline}</ThemedText> : null}
            <View style={styles.badges}>
              <Badge label={providerCategoryLabels[provider.category]} tone="solid" />
              <View style={styles.inline}>
                <Icon name="location-outline" size={16} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {provider.city}
                </ThemedText>
              </View>
              {provider.serviceModes.map((mode) => (
                <View key={mode} style={[styles.outline, { borderColor: theme.border }]}>
                  <ThemedText type="caption" style={styles.semibold}>
                    {serviceModeLabels[mode]}
                  </ThemedText>
                </View>
              ))}
            </View>
            <AuthorLine provider={provider} />
            <View style={styles.inlineActions}>
              <Button label="Partager" icon="share-outline" variant="outline" size="sm" onPress={share} />
              {provider.canManage ? null : <ReportButton type="provider" id={provider._id} title={provider.name} />}
            </View>
          </View>
        </View>

        <Block title="À propos">
          <ThemedText style={styles.body}>{provider.description}</ThemedText>
        </Block>

        {provider.services.length ? (
          <Block title="Services & tarifs">
            <View>
              {provider.services.map((service, index) => (
                <View
                  key={`${service.name}-${index}`}
                  style={[styles.service, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <ThemedText style={styles.flex}>{service.name}</ThemedText>
                  {service.price ? (
                    <ThemedText style={[styles.semibold, { color: theme.primary }]}>{service.price}</ThemedText>
                  ) : null}
                </View>
              ))}
            </View>
          </Block>
        ) : null}

        {photos.length ? (
          <Block title="Galerie">
            <PhotoGrid urls={photos} />
          </Block>
        ) : null}

        <ContactCard provider={provider} onWhatsApp={openWhatsApp} />
      </ScrollView>

      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, Spacing.two) + Spacing.one,
          },
        ]}>
        <View style={styles.barInner}>
          <WhatsAppButton onPress={openWhatsApp} />
        </View>
      </View>
    </ThemedView>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ThemedText style={styles.blockTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function AuthorLine({ provider }: { provider: Provider }) {
  const router = useRouter();
  const theme = useTheme();
  const name = provider.authorName || 'Anonyme';
  const slug = provider.authorSlug;
  return (
    <View style={styles.inline}>
      <Icon name="person-outline" size={16} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        Créée par{' '}
        {provider.isAuthor ? (
          <ThemedText type="small" style={styles.medium}>
            vous
          </ThemedText>
        ) : (
          <ThemedText
            type="small"
            style={styles.medium}
            onPress={slug ? () => router.push({ pathname: '/profiles/[slug]', params: { slug } }) : undefined}>
            {name}
          </ThemedText>
        )}
      </ThemedText>
    </View>
  );
}

function WhatsAppButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.whatsapp, pressed && { opacity: 0.85 }]}>
      <Icon name="logo-whatsapp" size={20} color="#ffffff" />
      <ThemedText style={styles.whatsappLabel}>Écrire sur WhatsApp</ThemedText>
    </Pressable>
  );
}

function ContactCard({ provider, onWhatsApp }: { provider: Provider; onWhatsApp: () => void }) {
  const theme = useTheme();
  const socials: { label: string; icon: IconName; url: string | null }[] = [
    { label: 'Instagram', icon: 'logo-instagram', url: safeExternalUrl(provider.instagram) },
    { label: 'Facebook', icon: 'logo-facebook', url: safeExternalUrl(provider.facebook) },
    { label: 'TikTok', icon: 'logo-tiktok', url: safeExternalUrl(provider.tiktok) },
  ];
  const website = safeExternalUrl(provider.website);
  const links: { label: string; icon: IconName; url: string }[] = [
    ...(provider.phone ? [{ label: provider.phone, icon: 'call-outline' as const, url: `tel:${provider.phone}` }] : []),
    ...(provider.email ? [{ label: provider.email, icon: 'mail-outline' as const, url: `mailto:${provider.email}` }] : []),
    ...(website ? [{ label: hostname(website), icon: 'globe-outline' as const, url: website }] : []),
  ];

  return (
    <View style={[styles.block, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ThemedText style={styles.blockTitle}>Contacter ce prestataire</ThemedText>
      <WhatsAppButton onPress={onWhatsApp} />
      {socials.some((social) => social.url) ? (
        <View style={styles.socials}>
          {socials.map((social) =>
            social.url ? (
              <Pressable
                key={social.label}
                accessibilityRole="link"
                accessibilityLabel={social.label}
                onPress={() => Linking.openURL(social.url!)}
                style={({ pressed }) => [
                  styles.social,
                  { borderColor: theme.border, backgroundColor: theme.background },
                  pressed && { opacity: 0.7 },
                ]}>
                <Icon name={social.icon} size={18} themeColor="text" />
              </Pressable>
            ) : null,
          )}
        </View>
      ) : null}
      {links.length ? (
        <View style={styles.links}>
          {links.map((link) => (
            <Pressable
              key={link.url}
              accessibilityRole="link"
              onPress={() => Linking.openURL(link.url)}
              style={({ pressed }) => [styles.inline, pressed && { opacity: 0.6 }]}>
              <Icon name={link.icon} size={16} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                {link.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ThemedText type="caption" themeColor="textSecondary">
        Mentionnez HalloMada quand vous contactez ce prestataire.
      </ThemedText>
    </View>
  );
}

/** Thumbnails in three columns; a tap opens them full screen. */
function PhotoGrid({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={styles.grid}>
        {urls.map((url) => (
          <Pressable key={url} accessibilityRole="imagebutton" onPress={() => setOpen(true)} style={styles.thumb}>
            <Image source={url} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          </Pressable>
        ))}
      </View>
      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.viewer}>
          <Gallery urls={urls} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={() => setOpen(false)}
            style={styles.viewerClose}>
            <Icon name="close" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: 112,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  showcase: { borderRadius: SHOWCASE_RADIUS, borderWidth: 1, overflow: 'hidden' },
  cover: { height: 160 },
  identity: { padding: Spacing.three, gap: Spacing.two },
  avatarRing: { alignSelf: 'flex-start', marginTop: -56, padding: 4, borderRadius: 999 },
  name: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  outline: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  semibold: { fontWeight: 600 },
  medium: { fontWeight: 500 },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  block: { borderRadius: SHOWCASE_RADIUS, borderWidth: 1, padding: Spacing.three, gap: Spacing.three },
  blockTitle: { fontSize: 18, lineHeight: 24, fontWeight: 600 },
  body: { lineHeight: 24 },
  service: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: '31.5%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden' },
  viewer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: Spacing.six, right: Spacing.three, padding: Spacing.two },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: WHATSAPP,
  },
  whatsappLabel: { color: '#ffffff', fontWeight: 600 },
  socials: { flexDirection: 'row', gap: Spacing.two },
  social: { width: 40, height: 40, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  links: { gap: Spacing.two },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  barInner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
});
