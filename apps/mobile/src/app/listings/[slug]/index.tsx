import { api } from '@convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { BookmarkButton } from '@/components/bookmark-button';
import { Button } from '@/components/button';
import { CenteredMessage, FactList, PendingBanner, Section } from '@/components/detail';
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

  if (listing === undefined) return <ActivityIndicator style={styles.loader} />;
  if (listing === null) {
    return (
      <CenteredMessage
        title="Annonce introuvable"
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
        <Gallery images={listing.images} />
        <View style={styles.content}>
          {listing.status === 'pending' ? (
            <PendingBanner
              title="Annonce en attente de validation"
              description="Visible uniquement par vous et les administrateurs jusqu’à sa validation."
            />
          ) : null}

          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {listingModeLabel(listing.listingMode)}
              {listing.status === 'closed' ? ' · Annonce clôturée' : ''}
            </ThemedText>
            <ThemedText type="subtitle">{listing.title}</ThemedText>
            <ThemedText themeColor="textSecondary">{placeLabel(listing)}</ThemedText>
            <ThemedText type="smallBold">
              {isRent ? 'Loyer mensuel total : ' : 'Prix de vente : '}
              {priceLabel(listing.price, listing.listingMode)}
            </ThemedText>
          </View>

          <ContactSection listing={listing} />

          <FactList facts={facts} />
          <Section title="Description" body={listing.description} />
          {listing.extras?.length ? (
            <Section
              title="Équipements et services"
              body={listing.extras.map((extra) => `• ${extra}`).join('\n')}
            />
          ) : null}

          <View style={styles.actions}>
            <BookmarkButton
              resourceType="realEstate"
              resourceId={listing._id}
              isBookmarked={listing.isBookmarked}
            />
            <Button label="Partager" onPress={share} />
            {listing.location ? (
              <Button
                label="Voir sur la carte"
                onPress={() =>
                  Linking.openURL(
                    `https://www.openstreetmap.org/?mlat=${listing.location!.lat}&mlon=${listing.location!.lng}#map=14/${listing.location!.lat}/${listing.location!.lng}`,
                  )
                }
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function Gallery({ images }: { images: Listing['images'] }) {
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MaxContentWidth);
  const [index, setIndex] = useState(0);
  const urls = images.map((image) => image.url).filter(Boolean);
  if (urls.length === 0) return null;

  return (
    <View style={[styles.gallery, { width: pageWidth }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth))
        }>
        {urls.map((url, i) => (
          <Image
            key={`${url}-${i}`}
            source={url}
            style={{ width: pageWidth, height: pageWidth * 0.7 }}
            contentFit="cover"
            transition={150}
            accessibilityLabel={`Photo ${i + 1} sur ${urls.length}`}
          />
        ))}
      </ScrollView>
      {urls.length > 1 ? (
        <ThemedView type="background" style={styles.counter}>
          <ThemedText type="small">
            {index + 1} / {urls.length}
          </ThemedText>
        </ThemedView>
      ) : null}
    </View>
  );
}

function ContactSection({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const alreadySent = useQuery(
    api.rentalFiles.queries.hasSentToListing,
    isAuthenticated ? { listingId: listing._id } : 'skip',
  );
  const quota = useApplicationQuota();

  if (user && user._id === listing.authorId) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Vous avez publié cette annonce. Les dossiers reçus sont visibles sur le site.
      </ThemedText>
    );
  }

  const phone = listing.contact?.phone;
  const email = listing.contact?.email;
  const acceptsDossier = listing.listingMode === 'rent' && listing.acceptsRentalFile === true;
  const quotaReached = quota != null && quota.limit !== null && quota.remaining === 0;

  return (
    <View style={styles.actions}>
      <ThemedText type="smallBold">Contact</ThemedText>
      {acceptsDossier ? (
        !isAuthenticated ? (
          <Button label="Envoyer mon dossier" primary onPress={() => router.navigate('/account')} />
        ) : alreadySent ? (
          <Button label="Dossier envoyé" onPress={() => {}} disabled />
        ) : (
          <>
            <Button
              label="Envoyer mon dossier"
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
          onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}
        />
      ) : null}
      {email ? (
        <Button label="Envoyer un e-mail" onPress={() => Linking.openURL(`mailto:${email}`)} />
      ) : null}
      {listing.contactAccessRequired ? (
        listing.contactVerificationRequired ? (
          <>
            <Button label="Vérifier mon e-mail pour contacter" onPress={() => openWeb('/verify-email')} />
            <ThemedText type="small" themeColor="textSecondary">
              Les coordonnées sont visibles une fois votre adresse e-mail vérifiée.
            </ThemedText>
          </>
        ) : (
          <Button label="Se connecter pour contacter" onPress={() => router.navigate('/account')} />
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
  loader: { marginTop: Spacing.five },
  gallery: { alignSelf: 'center' },
  counter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.one },
  actions: { gap: Spacing.two },
});
