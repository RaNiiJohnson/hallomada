import { api } from '@convex/_generated/api';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { AuthorLink } from '@/components/author-link';
import { BookmarkButton } from '@/components/bookmark-button';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ActionRow, Banner, CenteredMessage, FactList, LoadingScreen, PendingBanner, Section, SectionTitle } from '@/components/detail';
import { Gallery } from '@/components/gallery';
import { Icon, type IconName } from '@/components/icon';
import { OwnerPanel, ReceivedList } from '@/components/owner-panel';
import { ReportButton } from '@/components/report-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useApplicationQuota } from '@/hooks/use-application-quota';
import { formatDate } from '@/lib/job-labels';
import {
  areaLabel,
  formatEuro,
  listingModeLabel,
  placeLabel,
  priceLabel,
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
  const facts: [string, string | undefined][] = [
    ['Type', propertyTypeLabel(listing.propertyType)],
    ['Surface', areaLabel(listing.area)],
    ['Chambres', String(listing.bedrooms)],
    ['Salles de bain', String(listing.bathrooms)],
    ['Étage', String(listing.floor)],
    ['Charges', isRent && listing.charges !== undefined ? `${formatEuro(listing.charges)} /mois` : undefined],
    ['Caution', isRent && listing.deposit !== undefined ? formatEuro(listing.deposit) : undefined],
    ['Animaux', listing.pets ? 'Acceptés' : 'Non acceptés'],
    ['Disponible à partir du', listing.availableFrom ? formatDate(listing.availableFrom) : undefined],
    ['Publié le', formatDate(listing._creationTime)],
  ];

  const share = () => {
    const url = webUrl(`/listing/${listing.slug}`);
    void Share.share(url ? { message: `${listing.title}\n${url}`, url } : { message: listing.title });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: propertyTypeLabel(listing.propertyType) }} />
      <ScrollView>
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

          <Card style={styles.hero}>
            <View style={styles.badges}>
              <Badge label={listingModeLabel(listing.listingMode)} tone={isRent ? 'info' : 'primary'} />
              <Badge label={propertyTypeLabel(listing.propertyType)} icon="home-outline" />
              {listing.status === 'closed' ? <Badge label="Clôturée" icon="lock-closed-outline" /> : null}
            </View>
            <ThemedText type="subtitle">{listing.title}</ThemedText>
            <View style={styles.meta}>
              <Icon name="location-outline" size={16} themeColor="textSecondary" />
              <ThemedText themeColor="textSecondary" style={styles.flex}>
                {placeLabel(listing)}
              </ThemedText>
            </View>
            <View>
              <ThemedText type="title" themeColor="primaryText" style={styles.price}>
                {priceLabel(listing.price, listing.listingMode)}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {isRent ? 'Loyer mensuel total' : 'Prix de vente'}
              </ThemedText>
            </View>
            <View style={styles.keyFacts}>
              <KeyFact icon="resize-outline" label={areaLabel(listing.area) ?? '—'} />
              <KeyFact icon="bed-outline" label={`${listing.bedrooms} ch.`} />
              <KeyFact icon="water-outline" label={`${listing.bathrooms} sdb`} />
              {listing.pets ? <KeyFact icon="paw-outline" label="Animaux" /> : null}
            </View>
            <AuthorLink prefix="Publiée par" name={listing.authorName} slug={listing.authorSlug} />
          </Card>

          {user && user._id === listing.authorId ? <OwnerSection listing={listing} /> : <ContactSection listing={listing} />}

          <ActionRow>
            <BookmarkButton
              resourceType="realEstate"
              resourceId={listing._id}
              isBookmarked={listing.isBookmarked}
            />
            <Button label="Partager" icon="share-outline" onPress={share} />
            {listing.location ? (
              <Button
                label="Carte"
                icon="map-outline"
                onPress={() =>
                  Linking.openURL(
                    `https://www.openstreetmap.org/?mlat=${listing.location!.lat}&mlon=${listing.location!.lng}#map=14/${listing.location!.lat}/${listing.location!.lng}`,
                  )
                }
              />
            ) : null}
            {user?._id === listing.authorId ? null : (
              <ReportButton type="listing" id={listing._id} title={listing.title} />
            )}
          </ActionRow>

          <FactList facts={facts} />
          <Section title="Description" icon="document-text-outline" body={listing.description} />
          {listing.extras?.length ? (
            <View style={styles.actions}>
              <SectionTitle title="Équipements et services" icon="sparkles-outline" />
              <View style={styles.badges}>
                {listing.extras.map((extra) => (
                  <Badge key={extra} label={extra} icon="checkmark" />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function KeyFact({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={16} themeColor="textSecondary" />
      <ThemedText type="small">{label}</ThemedText>
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
    <Card style={styles.actions}>
      <SectionTitle title="Contact" icon="chatbubble-ellipses-outline" />
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
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: { flex: 1 },
  hero: { gap: Spacing.two },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  price: { fontSize: 28, lineHeight: 34 },
  keyFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  actions: { gap: Spacing.two },
});
