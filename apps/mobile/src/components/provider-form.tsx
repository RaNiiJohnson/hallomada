import { api } from '@convex/_generated/api';
import { MAX_LENGTH } from '@convex/utils/limits';
import {
  MAX_PROVIDER_PHOTOS,
  MAX_PROVIDER_SERVICE_NAME,
  MAX_PROVIDER_SERVICE_PRICE,
  MAX_PROVIDER_SERVICES,
  MAX_PROVIDER_TAGLINE,
  normalizePhoneNumber,
  normalizeSocialLink,
  normalizeWebsite,
  providerCategoryValues,
  providerServiceModeValues,
} from '@hallomada/shared/providers';
import { useAction, useMutation } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { Button, IconButton } from './button';
import { Card } from './card';
import { FormField } from './form-field';
import { Icon, type IconName } from './icon';
import { MultiSegmented, Segmented } from './segmented';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { pickPhotos } from '@/lib/photos';
import { providerCategoryLabels, serviceModeLabels } from '@/lib/provider-labels';
import { uploadLocalFile } from '@/lib/upload';

export type ProviderValues = FunctionArgs<typeof api.providers.mutations.createProvider>;
type StoredImage = { storageId: string };
/** A photo on screen: either already stored (`image`) or a local file to upload. */
type Photo = { uri: string; image?: StoredImage };

export type ProviderInitial = Omit<Partial<ProviderValues>, 'logo' | 'images'> & {
  logo?: { storageId: string; url: string | null };
  images?: { storageId: string; url: string | null }[];
};

const categoryOptions = providerCategoryValues.map((value) => ({ value, label: providerCategoryLabels[value] }));
const modeOptions = providerServiceModeValues.map((value) => ({ value, label: serviceModeLabels[value] }));

type Service = { name: string; price: string };
type Socials = { website: string; facebook: string; instagram: string; tiktok: string };

export function ProviderForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ProviderInitial;
  submitLabel: string;
  onSubmit: (values: ProviderValues) => Promise<void>;
}) {
  const theme = useTheme();
  const generateUploadUrl = useMutation(api.integrations.r2.generateProviderUploadUrl);
  const syncMetadata = useAction(api.integrations.r2.syncMetadata);

  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<ProviderValues['category']>(initial?.category ?? 'food');
  const [tagline, setTagline] = useState(initial?.tagline ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [serviceModes, setServiceModes] = useState<ProviderValues['serviceModes']>(initial?.serviceModes ?? []);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [services, setServices] = useState<Service[]>(
    initial?.services?.length
      ? initial.services.map((service) => ({ name: service.name, price: service.price ?? '' }))
      : [{ name: '', price: '' }],
  );
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [socials, setSocials] = useState<Socials>({
    website: initial?.website ?? '',
    facebook: initial?.facebook ?? '',
    instagram: initial?.instagram ?? '',
    tiktok: initial?.tiktok ?? '',
  });
  // Signed URLs are display-only: stored photos are sent back by key.
  const [logo, setLogo] = useState<Photo | null>(
    initial?.logo?.url ? { uri: initial.logo.url, image: { storageId: initial.logo.storageId } } : null,
  );
  const [photos, setPhotos] = useState<Photo[]>(
    (initial?.images ?? []).flatMap((image) =>
      image.url ? [{ uri: image.url, image: { storageId: image.storageId } }] : [],
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>();

  const busy = Boolean(status);

  async function chooseLogo() {
    try {
      const [uri] = await pickPhotos({ limit: 1, maxWidth: 600, aspect: [1, 1] });
      if (uri) setLogo({ uri });
    } catch {
      Alert.alert('Erreur', 'Impossible de préparer cette image.');
    }
  }

  async function addPhotos() {
    try {
      setStatus('Préparation des photos…');
      const prepared = await pickPhotos({ limit: MAX_PROVIDER_PHOTOS - photos.length });
      setPhotos((current) => [...current, ...prepared.map((uri) => ({ uri }))].slice(0, MAX_PROVIDER_PHOTOS));
    } catch {
      Alert.alert('Erreur', 'Impossible de préparer ces photos.');
    } finally {
      setStatus(undefined);
    }
  }

  function updateService(index: number, patch: Partial<Service>) {
    setServices((current) => current.map((service, i) => (i === index ? { ...service, ...patch } : service)));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Indiquez le nom de votre activité.';
    if (!city.trim()) next.city = 'Indiquez votre ville.';
    if (!serviceModes.length) next.serviceModes = 'Choisissez au moins un mode de service.';
    if (description.trim().length < 20) next.description = 'Décrivez votre activité en 20 caractères minimum.';
    if (!normalizePhoneNumber(whatsapp)) next.whatsapp = 'Numéro WhatsApp invalide.';
    if (phone.trim() && !normalizePhoneNumber(phone)) next.phone = 'Numéro de téléphone invalide.';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Adresse e-mail invalide.';
    if (socials.website.trim() && !normalizeWebsite(socials.website)) next.website = 'Lien invalide.';
    for (const network of ['facebook', 'instagram', 'tiktok'] as const) {
      if (socials[network].trim() && !normalizeSocialLink(network, socials[network])) next[network] = 'Lien ou pseudo invalide.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function upload(photo: Photo) {
    if (photo.image) return photo.image;
    return {
      storageId: await uploadLocalFile({ uri: photo.uri, mimeType: 'image/jpeg' as const }, generateUploadUrl, syncMetadata),
    };
  }

  async function submit() {
    if (!validate()) {
      Alert.alert('Formulaire incomplet', 'Corrigez les champs en rouge.');
      return;
    }
    try {
      const toUpload = photos.filter((photo) => !photo.image).length + (logo && !logo.image ? 1 : 0);
      setStatus(toUpload ? `Envoi des images (${toUpload})…` : 'Enregistrement…');
      const storedLogo = logo ? await upload(logo) : undefined;
      const images: StoredImage[] = [];
      for (const photo of photos) images.push(await upload(photo));
      setStatus('Enregistrement…');
      const optional = (value: string) => value.trim() || undefined;
      await onSubmit({
        name: name.trim(),
        category,
        tagline: optional(tagline),
        city: city.trim(),
        serviceModes,
        description: description.trim(),
        services: services
          .filter((service) => service.name.trim())
          .map((service) => ({ name: service.name.trim(), price: optional(service.price) })),
        logo: storedLogo,
        images,
        whatsapp: whatsapp.trim(),
        phone: optional(phone),
        email: optional(email),
        website: optional(socials.website),
        facebook: optional(socials.facebook),
        instagram: optional(socials.instagram),
        tiktok: optional(socials.tiktok),
      });
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, "L'enregistrement a échoué."));
    } finally {
      setStatus(undefined);
    }
  }

  const socialFields: { key: keyof Socials; label: string; icon: IconName; placeholder: string }[] = [
    { key: 'website', label: 'Site web', icon: 'globe-outline', placeholder: 'https://…' },
    { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', placeholder: 'Lien ou pseudo' },
    { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', placeholder: '@pseudo' },
    { key: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', placeholder: '@pseudo' },
  ];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Group title="Votre activité" icon="storefront-outline">
            <View style={styles.logoRow}>
              <Pressable onPress={chooseLogo} accessibilityLabel="Choisir un logo">
                {logo ? (
                  <Image source={{ uri: logo.uri }} style={[styles.logo, { backgroundColor: theme.muted }]} contentFit="cover" />
                ) : (
                  <Avatar name={name || '?'} size={72} />
                )}
              </Pressable>
              <View style={styles.flex}>
                <ThemedText type="smallBold">Logo</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Image carrée, affichée en rond.
                </ThemedText>
                <View style={styles.inline}>
                  <Button label={logo ? 'Changer' : 'Ajouter'} icon="image-outline" size="sm" onPress={chooseLogo} />
                  {logo ? <Button label="Retirer" size="sm" variant="ghost" onPress={() => setLogo(null)} /> : null}
                </View>
              </View>
            </View>
            <FormField label="Nom *" value={name} onChangeText={setName} maxLength={MAX_LENGTH.name} error={errors.name} />
            <Field label="Catégorie *">
              <Segmented options={categoryOptions} value={category} onChange={setCategory} />
            </Field>
            <FormField
              label="Accroche (facultatif)"
              placeholder="Ex : Traiteur malgache pour vos fêtes"
              value={tagline}
              onChangeText={setTagline}
              maxLength={MAX_PROVIDER_TAGLINE}
            />
            <FormField label="Ville *" value={city} onChangeText={setCity} maxLength={MAX_LENGTH.name} error={errors.city} />
            <Field label="Où proposez-vous vos services ? *" error={errors.serviceModes}>
              <MultiSegmented options={modeOptions} values={serviceModes} onChange={setServiceModes} />
            </Field>
            <FormField
              label="Description *"
              hint="Présentez votre activité, votre expérience, vos spécialités."
              value={description}
              onChangeText={setDescription}
              maxLength={MAX_LENGTH.description}
              multiline
              error={errors.description}
            />
          </Group>

          <Group title={`Photos (${photos.length}/${MAX_PROVIDER_PHOTOS})`} icon="images-outline">
            {photos.length ? (
              <View style={styles.photos}>
                {photos.map(({ uri }) => (
                  <Pressable
                    key={uri}
                    accessibilityLabel="Retirer la photo"
                    onPress={() => setPhotos((current) => current.filter((photo) => photo.uri !== uri))}>
                    <Image source={{ uri }} style={[styles.photo, { backgroundColor: theme.muted }]} contentFit="cover" />
                    <View style={styles.removeBadge}>
                      <Icon name="close" size={14} color="#fff" />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Montrez vos réalisations : plats, séances photo, coiffures…
              </ThemedText>
            )}
            {photos.length < MAX_PROVIDER_PHOTOS ? (
              <Button label="Ajouter des photos" icon="add" variant="outline" onPress={addPhotos} disabled={busy} />
            ) : null}
          </Group>

          <Group title="Services & tarifs" icon="pricetags-outline">
            {services.map((service, index) => (
              <View key={index} style={styles.serviceRow}>
                <View style={styles.serviceName}>
                  <FormField
                    label={index === 0 ? 'Service' : ' '}
                    placeholder="Ex : Buffet 20 personnes"
                    value={service.name}
                    onChangeText={(value) => updateService(index, { name: value })}
                    maxLength={MAX_PROVIDER_SERVICE_NAME}
                  />
                </View>
                <View style={styles.servicePrice}>
                  <FormField
                    label={index === 0 ? 'Prix' : ' '}
                    placeholder="Dès 150 €"
                    value={service.price}
                    onChangeText={(value) => updateService(index, { price: value })}
                    maxLength={MAX_PROVIDER_SERVICE_PRICE}
                  />
                </View>
                <IconButton
                  icon="trash-outline"
                  tone="plain"
                  size={48}
                  label="Retirer ce service"
                  onPress={() => setServices((current) => current.filter((_, i) => i !== index))}
                />
              </View>
            ))}
            {services.length < MAX_PROVIDER_SERVICES ? (
              <Button
                label="Ajouter un service"
                icon="add"
                variant="outline"
                onPress={() => setServices((current) => [...current, { name: '', price: '' }])}
              />
            ) : null}
          </Group>

          <Group title="Contact" icon="call-outline">
            <FormField
              label="WhatsApp *"
              placeholder="+49 151 23456789"
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={setWhatsapp}
              error={errors.whatsapp}
            />
            <FormField
              label="Téléphone (facultatif)"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
            />
            <FormField
              label="E-mail (facultatif)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
          </Group>

          <Group title="Liens" icon="link-outline">
            {socialFields.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                value={socials[field.key]}
                onChangeText={(value) => setSocials((current) => ({ ...current, [field.key]: value }))}
                error={errors[field.key]}
              />
            ))}
          </Group>

          <ThemedText type="small" themeColor="textSecondary">
            Votre page est publiée (ou republiée après modification) après validation par l’administration.
          </ThemedText>
          {status ? (
            <ThemedText type="small" themeColor="textSecondary">
              {status}
            </ThemedText>
          ) : null}
          <Button label={submitLabel} icon="checkmark" size="md" primary loading={busy} onPress={submit} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function Group({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <Card style={styles.group}>
      <View style={styles.inline}>
        <Icon name={icon} size={18} themeColor="primaryText" />
        <ThemedText type="heading">{title}</ThemedText>
      </View>
      {children}
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
      {error ? (
        <ThemedText type="small" themeColor="destructive">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  group: { gap: Spacing.three },
  field: { gap: Spacing.two },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  logo: { width: 72, height: 72, borderRadius: Radius.full },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photo: { width: 96, height: 96, borderRadius: Radius.md },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  serviceName: { flex: 3 },
  servicePrice: { flex: 2 },
});
