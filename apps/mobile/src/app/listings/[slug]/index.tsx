import { api } from '@convex/_generated/api';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthorLink } from '@/components/author-link';
import { BookmarkIcon } from '@/components/bookmark-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { ActionRow, Banner, CenteredMessage, LoadingScreen, PendingBanner } from '@/components/detail';
import { Gallery } from '@/components/gallery';
import { Icon, type IconName } from '@/components/icon';
import { OwnerPanel, ReceivedList } from '@/components/owner-panel';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useApplicationQuota } from '@/hooks/use-application-quota';
import { useRecordView } from '@/hooks/use-record-view';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/job-labels';
import {
  areaLabel,
  formatEuro,
  listingModeLabel,
  placeLabel,
  propertyTypeLabel,
} from '@/lib/listing-labels';
import { openWeb, webUrl } from '@/lib/web';

type Listing = NonNullable<
  ReturnType<typeof useQuery<typeof api.listings.queries.getListingWithContact>>
>;

export default function ListingDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const listing = useQuery(api.listings.queries.getListingWithContact, { slug });
  const user = useQuery(api.auth.auth.getCurrentUser);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [contactOpen, setContactOpen] = useState(false);
  const [now] = useState(() => Date.now());
  useRecordView(listing ? { type: 'listing', id: listing._id } : null);

  if (listing === undefined) return <LoadingScreen />;
  if (listing === null) {
    return (
      <CenteredMessage
        icon="home-outline"        title="Annonce introuvable"
        description="Elle a peut-être été retirée ou n'est plus visible."
      />
    );
  }

  const isRent = listing.listingMode === 'rent';
  const isOwner = user?._id === listing.authorId;
  const rentRows: [string, string][] = isRent
    ? ([
        ['Charges mensuelles', listing.charges !== undefined ? `${formatEuro(listing.charges)} /mois` : undefined],
        ['Caution', listing.deposit !== undefined ? formatEuro(listing.deposit) : undefined],
      ].filter((row): row is [string, string] => Boolean(row[1])))
    : [];

  const share = () => {
    const url = webUrl(`/listing/${listing.slug}`);
    void Share.share(url ? { message: `${listing.title}\n${url}`, url } : { message: listing.title });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton icon="share-outline" label="Partager" onPress={share} />
              <BookmarkIcon resourceType="realEstate" resourceId={listing._id} isBookmarked={listing.isBookmarked} />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={!isOwner && styles.scrollWithBar}>
        <Gallery urls={listing.images.map((image) => image.url)} />
        <View style={styles.content}>
          {listing.status === 'pending' ? (
            <PendingBanner
              title="Annonce en attente de validation"
              description="Visible uniquement par vous et les administrateurs jusqu’à sa validation."
            />
          ) : listing.status === 'rejected' ? (
            <Banner tone="danger" icon="close-circle-outline" title="Annonce refusée" description="Modifiez-la puis renvoyez-la en validation." />
          ) : null}

          <View style={styles.hero}>
            <View style={styles.badges}>
              <Badge label={propertyTypeLabel(listing.propertyType)} tone="secondary" />
              <Badge label={listingModeLabel(listing.listingMode)} tone="solid" />
              {listing.status === 'closed' ? <Badge label="Clôturée" icon="lock-closed-outline" /> : null}
            </View>
            <ThemedText style={styles.title}>{listing.title}</ThemedText>
            <View style={styles.meta}>
              <Icon name="location-outline" size={16} themeColor="textSecondary" />
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                {placeLabel(listing)}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.priceBlock, { borderTopColor: theme.border }]}>
            <ThemedText type="caption" themeColor="textSecondary">
              {isRent ? 'Loyer mensuel total' : 'Prix de vente'}
            </ThemedText>
            <ThemedText style={styles.price}>
              {formatEuro(listing.price)}
              {isRent ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.per}>
                  {' '}/mois
                </ThemedText>
              ) : null}
            </ThemedText>
          </View>

          {rentRows.length ? (
            <View style={[styles.rentBox, { backgroundColor: theme.muted }]}>
              {rentRows.map(([label, value], index) => (
                <View
                  key={label}
                  style={[styles.rentRow, index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                  <ThemedText type="smallBold">{value}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {isOwner ? <OwnerSection listing={listing} /> : null}

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Caractéristiques</ThemedText>
            <View style={styles.tiles}>
              <Tile icon="bed-outline" value={String(listing.bedrooms)} label={listing.bedrooms > 1 ? 'Chambres' : 'Chambre'} />
              <Tile icon="water-outline" value={String(listing.bathrooms)} label={listing.bathrooms > 1 ? 'Salles de bain' : 'Salle de bain'} />
              <Tile icon="resize-outline" value={areaLabel(listing.area)} label="Surface" />
              <Tile icon="layers-outline" value={listing.floor === 0 ? 'RDC' : String(listing.floor)} label="Étage" />
            </View>
            <View style={styles.perks}>
              <Perk
                icon="calendar-outline"
                label={
                  listing.availableFrom && listing.availableFrom > now
                    ? `Disponible à partir du ${formatDate(listing.availableFrom)}`
                    : 'Disponible immédiatement'
                }
              />
              <Perk icon="paw-outline" label={listing.pets ? 'Animaux acceptés' : 'Animaux non acceptés'} />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Description</ThemedText>
            <ThemedText style={styles.body}>{listing.description}</ThemedText>
          </View>

          {listing.extras?.length ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Équipements et services</ThemedText>
              <View style={styles.badges}>
                {listing.extras.map((extra) => (
                  <Badge key={extra} label={extra} tone="secondary" icon="checkmark" />
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <AuthorLink prefix="Publiée par" name={listing.authorName} slug={listing.authorSlug} />
            <ThemedText type="caption" themeColor="textSecondary">
              Publiée le {formatDate(listing._creationTime)}
            </ThemedText>
            <ActionRow>
              {listing.location ? (
                <Button
                  label="Voir sur la carte"
                  icon="map-outline"
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    Linking.openURL(
                      `https://www.openstreetmap.org/?mlat=${listing.location!.lat}&mlon=${listing.location!.lng}#map=14/${listing.location!.lat}/${listing.location!.lng}`,
                    )
                  }
                />
              ) : null}
              {isOwner ? null : <ReportButton type="listing" id={listing._id} title={listing.title} />}
            </ActionRow>
          </View>
        </View>
      </ScrollView>

      {isOwner ? null : (
        <View
          style={[
            styles.bar,
            { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.two) + Spacing.one },
          ]}>
          <View style={styles.barInner}>
            <Button
              label="Contacter le propriétaire"
              icon="chatbubble-outline"
              primary
              size="md"
              onPress={() => setContactOpen(true)}
            />
          </View>
        </View>
      )}
      <BottomSheet visible={contactOpen} onClose={() => setContactOpen(false)} title="Contacter le propriétaire">
        <ContactSection listing={listing} />
      </BottomSheet>
    </ThemedView>
  );
}

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={styles.iconButton}>
      <Icon name={icon} size={20} themeColor="text" />
    </Pressable>
  );
}

function Tile({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.muted }]}>
      <Icon name={icon} size={20} color={theme.primary} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {value}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {label}
        </ThemedText>
      </View>
    </View>
  );
}

function Perk({ icon, label }: { icon: IconName; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={20} color={theme.primary} />
      <ThemedText type="smallBold" style={styles.flex}>
        {label}
      </ThemedText>
    </View>
  );
}

function OwnerSection({ listing }: { listing: Listing }) {
  const router = useRouter();
  const setStatus = useMutation(api.listings.mutations.setListingStatus);
  const archive = useMutation(api.listings.mutations.archiveListing);
  const dossiers = useQuery(
    api.rentalFiles.queries.listReceived,
    listing.listingMode === 'rent' ? { listingId: listing._id } : 'skip',
  );
  return (
    <>
      <OwnerPanel
        noun="annonce"
        status={listing.status}
        onEdit={() => router.push({ pathname: '/listings/[slug]/edit', params: { slug: listing.slug } })}
        onSetStatus={(next) =>
          next === 'archived'
            ? archive({ listingId: listing._id })
            : setStatus({ listingId: listing._id, status: next })
        }
      />
      {listing.listingMode === 'rent' ? (
        <ReceivedList
          title="Dossiers reçus"
          empty="Aucun dossier reçu pour le moment."
          closedHint="Accès retiré par le candidat ou expiré."
          rows={dossiers?.map((row) => {
            const url = row.token ? webUrl(`/dossier/${row.token}`) : undefined;
            return {
              _id: row._id,
              name: row.candidateName,
              slug: row.candidateSlug,
              at: row.sentAt,
              highlighted: row.highlighted,
              message: row.message,
              link: url ? { label: 'Ouvrir le dossier', url, icon: 'folder-open-outline' } : null,
            };
          })}
        />
      ) : null}
    </>
  );
}

function ContactSection({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const alreadySent = useQuery(
    api.rentalFiles.queries.hasSentToListing,
    isAuthenticated ? { listingId: listing._id } : 'skip',
  );
  const quota = useApplicationQuota();

  const phone = listing.contact?.phone;
  const email = listing.contact?.email;
  const acceptsDossier = listing.listingMode === 'rent' && listing.acceptsRentalFile === true;
  const quotaReached = quota != null && quota.limit !== null && quota.remaining === 0;

  return (
    <View style={styles.actions}>
      <AuthorLink prefix="Publiée par" name={listing.authorName} slug={listing.authorSlug} />
      {acceptsDossier ? (
        !isAuthenticated ? (
          <Button label="Envoyer mon dossier" icon="folder-open-outline" size="md" primary onPress={() => router.navigate('/account')} />
        ) : alreadySent ? (
          <Button label="Dossier envoyé" icon="checkmark-circle-outline" onPress={() => {}} disabled />
        ) : (
          <>
            <Button
              label="Envoyer mon dossier"
              icon="folder-open-outline"
              size="md"
              primary
              loading={alreadySent === undefined}
              disabled={quotaReached}
              onPress={() =>
                router.push({ pathname: '/listings/[slug]/dossier', params: { slug: listing.slug } })
              }
            />
            {quotaReached ? (
              <ThemedText type="small" themeColor="textSecondary">
                Vous avez utilisé toutes vos candidatures gratuites ce mois-ci.
              </ThemedText>
            ) : null}
          </>
        )
      ) : null}
      {phone ? (
        <Button
          label="Contacter sur WhatsApp"
          icon="logo-whatsapp"
          variant="outline"
          onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}
        />
      ) : null}
      {email ? (
        <Button label="Envoyer un e-mail" icon="mail-outline" variant="outline" onPress={() => Linking.openURL(`mailto:${email}`)} />
      ) : null}
      {listing.contactAccessRequired ? (
        listing.contactVerificationRequired ? (
          <>
            <Button label="Vérifier mon e-mail pour contacter" icon="mail-unread-outline" onPress={() => openWeb('/verify-email')} />
            <ThemedText type="small" themeColor="textSecondary">
              Les coordonnées sont visibles une fois votre adresse e-mail vérifiée.
            </ThemedText>
          </>
        ) : (
          <Button label="Se connecter pour contacter" icon="log-in-outline" primary onPress={() => router.navigate('/account')} />
        )
      ) : null}
      {!phone && !email && !listing.contactAccessRequired && !acceptsDossier ? (
        <ThemedText type="small" themeColor="textSecondary">
          Coordonnées indisponibles
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollWithBar: { paddingBottom: 96 },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: Spacing.two },
  title: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  priceBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three, gap: 2, marginTop: -Spacing.two },
  price: { fontSize: 30, lineHeight: 36, fontWeight: 700 },
  per: { fontWeight: 400 },
  rentBox: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginTop: -Spacing.two },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingVertical: Spacing.three },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: 600 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tile: {
    flexBasis: '45%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    padding: Spacing.two + Spacing.one,
    borderRadius: Radius.md,
  },
  perks: { gap: Spacing.three },
  body: { lineHeight: 24 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three, gap: Spacing.two },
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
  actions: { gap: Spacing.two },
});
