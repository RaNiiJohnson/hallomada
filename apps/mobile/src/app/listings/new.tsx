import { api } from '@convex/_generated/api';
import { MAX_LENGTH } from '@convex/utils/limits';
import {
  MAX_LISTING_AMOUNT,
  MAX_LISTING_AREA,
  MAX_LISTING_FLOOR,
  MAX_LISTING_PHOTOS,
  MAX_LISTING_ROOMS,
  MIN_LISTING_FLOOR,
} from '@hallomada/shared/listing-limits';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { errorMessage, parseDateOnly, parseNumber } from '@/lib/errors';
import {
  type ListingMode,
  listingModeLabel,
  type PropertyType,
  propertyTypeLabel,
} from '@/lib/listing-labels';
import { uploadLocalFile } from '@/lib/upload';

const MAX_PHOTO_WIDTH = 1600;

const modeOptions = (['rent', 'sale'] as ListingMode[]).map((value) => ({
  value,
  label: listingModeLabel(value),
}));
const typeOptions = (['apartment', 'room', 'studio', 'house', 'shared'] as PropertyType[]).map(
  (value) => ({ value, label: propertyTypeLabel(value) }),
);
const yesNo = [
  { value: 'yes' as const, label: 'Oui' },
  { value: 'no' as const, label: 'Non' },
];
const contactModes = [
  { value: 'dossier' as const, label: 'Dossier de location' },
  { value: 'contact' as const, label: 'Contact uniquement' },
];

/** Converts a picked photo to a JPEG no wider than MAX_PHOTO_WIDTH. */
async function preparePhoto(asset: ImagePicker.ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_PHOTO_WIDTH) context.resize({ width: MAX_PHOTO_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return result.uri;
}

export default function NewListingScreen() {
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const createListing = useMutation(api.listings.mutations.createListing);
  const generateUploadUrl = useMutation(api.integrations.r2.generateListingUploadUrl);
  const syncMetadata = useAction(api.integrations.r2.syncMetadata);

  const [mode, setMode] = useState<ListingMode>('rent');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [price, setPrice] = useState('');
  const [charges, setCharges] = useState('');
  const [deposit, setDeposit] = useState('');
  const [area, setArea] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [floor, setFloor] = useState('');
  const [pets, setPets] = useState<'yes' | 'no'>('no');
  const [availableFrom, setAvailableFrom] = useState('');
  const [contactMode, setContactMode] = useState<'dossier' | 'contact'>('dossier');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState<string>();
  const [description, setDescription] = useState('');
  const [extras, setExtras] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [status, setStatus] = useState<string>();

  const isRent = mode === 'rent';
  const email = contactEmail ?? user?.email ?? '';

  async function pickPhotos() {
    const remaining = MAX_LISTING_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    try {
      setStatus('Préparation des photos…');
      const prepared = await Promise.all(result.assets.slice(0, remaining).map(preparePhoto));
      setPhotos((current) => [...current, ...prepared].slice(0, MAX_LISTING_PHOTOS));
    } catch {
      Alert.alert('Erreur', 'Impossible de préparer ces photos.');
    } finally {
      setStatus(undefined);
    }
  }

  function removePhoto(uri: string) {
    setPhotos((current) => current.filter((photo) => photo !== uri));
  }

  function validate() {
    const numbers = [price, charges, deposit, area, bedrooms, bathrooms, floor].map(parseNumber);
    if (!title.trim()) return 'Le titre est requis.';
    if (!city.trim()) return 'La ville est requise.';
    if (numbers.some((value) => value === null)) return 'Les montants et surfaces doivent être des nombres.';
    const [p, c, d, a, beds, baths, fl] = numbers as (number | undefined)[];
    if (p === undefined || p < 0 || p > MAX_LISTING_AMOUNT) return 'Indiquez un prix valide.';
    if ((c ?? 0) < 0 || (c ?? 0) > MAX_LISTING_AMOUNT || (d ?? 0) < 0 || (d ?? 0) > MAX_LISTING_AMOUNT) {
      return 'Les charges et la caution doivent être des montants valides.';
    }
    if (a === undefined || a <= 0 || a > MAX_LISTING_AREA) return 'Indiquez une surface valide.';
    for (const [value, label] of [
      [beds, 'chambres'],
      [baths, 'salles de bain'],
    ] as const) {
      if (value === undefined || !Number.isInteger(value) || value < 0 || value > MAX_LISTING_ROOMS) {
        return `Indiquez un nombre de ${label} valide.`;
      }
    }
    if (fl === undefined || !Number.isInteger(fl) || fl < MIN_LISTING_FLOOR || fl > MAX_LISTING_FLOOR) {
      return 'Indiquez un étage valide (0 pour le rez-de-chaussée).';
    }
    const date = parseDateOnly(availableFrom);
    if (date === null) return 'La date doit être au format AAAA-MM-JJ.';
    if (isRent && !date) return 'La date de disponibilité est requise.';
    if (!phone.trim() && !email.trim()) return 'Indiquez un numéro WhatsApp ou un e-mail.';
    if (phone.trim() && !/^\+?[0-9 ()-]{6,30}$/.test(phone.trim())) return 'Numéro WhatsApp invalide.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Adresse e-mail invalide.';
    if (!description.trim()) return 'La description est requise.';
    if (photos.length === 0) return 'Ajoutez au moins une photo.';
    return null;
  }

  async function submit() {
    const invalid = validate();
    if (invalid) {
      Alert.alert('Formulaire incomplet', invalid);
      return;
    }
    const number = (value: string) => parseNumber(value) ?? undefined;
    const date = parseDateOnly(availableFrom);
    try {
      const keys: string[] = [];
      for (const [index, uri] of photos.entries()) {
        setStatus(`Envoi des photos (${index + 1}/${photos.length})…`);
        keys.push(
          await uploadLocalFile({ uri, mimeType: 'image/jpeg' as const }, generateUploadUrl, syncMetadata),
        );
      }
      setStatus('Publication…');
      await createListing({
        title: title.trim(),
        propertyType,
        listingMode: mode,
        city: city.trim(),
        neighborhood: neighborhood.trim() || undefined,
        price: number(price)!,
        charges: isRent ? number(charges) : undefined,
        deposit: isRent ? number(deposit) : undefined,
        area: number(area)!,
        bedrooms: number(bedrooms)!,
        bathrooms: number(bathrooms)!,
        floor: number(floor)!,
        pets: pets === 'yes',
        images: keys.map((storageId) => ({ storageId })),
        description: description.trim(),
        extras: extras
          .split(',')
          .map((extra) => extra.trim())
          .filter(Boolean)
          .map((extra) => extra.slice(0, MAX_LENGTH.listItem)),
        availableFrom: date ? Date.parse(date) : undefined,
        acceptsRentalFile: isRent ? contactMode === 'dossier' : undefined,
        contact: {
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
      router.back();
      Alert.alert('Annonce envoyée', 'Votre annonce a été envoyée à l’administration pour validation.');
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, "Erreur lors de la création de l'annonce."));
    } finally {
      setStatus(undefined);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Choice label="Type d'annonce *">
            <Segmented options={modeOptions} value={mode} onChange={setMode} />
          </Choice>
          <Choice label="Type de bien *">
            <Segmented options={typeOptions} value={propertyType} onChange={setPropertyType} />
          </Choice>
          <FormField
            label="Titre *"
            value={title}
            onChangeText={setTitle}
            maxLength={MAX_LENGTH.title}
            placeholder="Ex : Appartement 2 pièces lumineux"
          />
          <FormField label="Ville *" value={city} onChangeText={setCity} maxLength={MAX_LENGTH.name} />
          <FormField
            label="Quartier (facultatif)"
            hint="Pas d'adresse exacte : elle ne doit pas apparaître publiquement."
            value={neighborhood}
            onChangeText={setNeighborhood}
            maxLength={MAX_LENGTH.name}
          />
          <FormField
            label={isRent ? 'Loyer mensuel total en € *' : 'Prix de vente en € *'}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          {isRent ? (
            <>
              <FormField
                label="Charges mensuelles en € (facultatif)"
                value={charges}
                onChangeText={setCharges}
                keyboardType="decimal-pad"
              />
              <FormField
                label="Caution en € (facultatif)"
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="decimal-pad"
              />
            </>
          ) : null}
          <FormField label="Surface en m² *" value={area} onChangeText={setArea} keyboardType="decimal-pad" />
          <FormField label="Chambres *" value={bedrooms} onChangeText={setBedrooms} keyboardType="number-pad" />
          <FormField
            label="Salles de bain *"
            value={bathrooms}
            onChangeText={setBathrooms}
            keyboardType="number-pad"
          />
          <FormField
            label="Étage *"
            hint="0 pour le rez-de-chaussée."
            value={floor}
            onChangeText={setFloor}
            keyboardType="numbers-and-punctuation"
          />
          <Choice label="Animaux acceptés">
            <Segmented options={yesNo} value={pets} onChange={setPets} />
          </Choice>
          <FormField
            label={isRent ? 'Disponible à partir du *' : 'Disponible à partir du (facultatif)'}
            value={availableFrom}
            onChangeText={setAvailableFrom}
            placeholder="AAAA-MM-JJ"
            keyboardType="numbers-and-punctuation"
          />

          <Choice label={`Photos * (${photos.length}/${MAX_LISTING_PHOTOS})`}>
            {photos.length ? (
              <View style={styles.photos}>
                {photos.map((uri) => (
                  <Pressable
                    key={uri}
                    accessibilityLabel="Retirer la photo"
                    onPress={() => removePhoto(uri)}>
                    <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                    <ThemedText type="small" style={styles.remove}>
                      Retirer
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {photos.length < MAX_LISTING_PHOTOS ? (
              <Button label="Ajouter des photos" onPress={pickPhotos} disabled={Boolean(status)} />
            ) : null}
          </Choice>

          <FormField
            label="Description *"
            hint="Pas de numéro, d'e-mail ni d'adresse exacte dans le texte public."
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_LENGTH.description}
            multiline
          />
          <FormField
            label="Équipements et services (facultatif)"
            hint="Séparés par des virgules. Ex : Balcon, Cuisine équipée, Wi-Fi"
            value={extras}
            onChangeText={setExtras}
          />

          {isRent ? (
            <Choice label="Comment être contacté ?">
              <Segmented options={contactModes} value={contactMode} onChange={setContactMode} />
              <ThemedText type="small" themeColor="textSecondary">
                {contactMode === 'dossier'
                  ? 'Les candidats peuvent vous envoyer leur dossier de location depuis l’annonce.'
                  : 'Les candidats vous contactent directement par WhatsApp ou e-mail.'}
              </ThemedText>
            </Choice>
          ) : null}
          <FormField
            label="Numéro WhatsApp"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+49 151 23456789"
          />
          <FormField
            label="E-mail de contact"
            hint="Au moins un moyen de contact est requis. Visible uniquement par les membres connectés."
            value={email}
            onChangeText={setContactEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <ThemedText type="small" themeColor="textSecondary">
            L’annonce est publiée après validation par l’administration.
          </ThemedText>
          {status ? (
            <ThemedText type="small" themeColor="textSecondary">
              {status}
            </ThemedText>
          ) : null}
          <Button label="Publier l'annonce" primary loading={Boolean(status)} onPress={submit} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.choice}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  choice: { gap: Spacing.two },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photo: { width: 96, height: 96, borderRadius: Spacing.two },
  remove: { textAlign: 'center' },
});
