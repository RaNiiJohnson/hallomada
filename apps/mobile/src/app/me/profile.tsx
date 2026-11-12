import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/betterAuth/_generated/dataModel';
import { useAction, useMutation, useQuery } from 'convex/react';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CenteredMessage, LoadingScreen } from '@/components/detail';
import { FormField } from '@/components/form-field';
import { Icon, type IconName } from '@/components/icon';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { pickPhotos } from '@/lib/photos';
import { uploadLocalFile } from '@/lib/upload';

const PDF = 'application/pdf' as const;
const MAX_CV_SIZE = 5 * 1024 * 1024;
const MAX_BIO = 500;

const statusOptions = [
  { value: 'active', label: 'Actif' },
  { value: 'looking_for_job', label: 'Ouvert aux opportunités' },
  { value: 'on_sabbatical', label: 'En sabbatique' },
  { value: 'inactive', label: 'Inactif' },
];

type User = Doc<'user'>;

export default function MyProfileScreen() {
  const user = useQuery(api.auth.auth.getCurrentUser);
  if (user === undefined) return <LoadingScreen />;
  if (user === null) {
    return <CenteredMessage icon="person-outline" title="Connexion requise" description="Connectez-vous pour modifier votre profil." />;
  }
  return <ProfileEditor user={user as User} />;
}

function ProfileEditor({ user }: { user: User }) {
  const router = useRouter();
  const updateUser = useMutation(api.auth.users.updateUser);
  const [name, setName] = useState(user.name);
  const [headline, setHeadline] = useState(user.headline ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [country, setCountry] = useState(user.country ?? '');
  const [field, setField] = useState(user.field ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [skills, setSkills] = useState((user.skills ?? []).join(', '));
  const [roles, setRoles] = useState((user.roles ?? []).join(', '));
  const [journey, setJourney] = useState((user.journey ?? []).join('\n'));
  const [experience, setExperience] = useState(user.experienceYears != null ? String(user.experienceYears) : '');
  const [status, setStatus] = useState(user.status ?? 'active');
  const [isServiceProvider, setIsServiceProvider] = useState(Boolean(user.isServiceProvider));
  const [isPublic, setIsPublic] = useState(user.isPublic !== false);
  const [showEmail, setShowEmail] = useState(Boolean(user.showEmail));
  const [saving, setSaving] = useState(false);

  const list = (value: string, separator: RegExp) =>
    value
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
  const text = (value: string) => value.trim() || null;

  async function save() {
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Indiquez votre nom.');
      return;
    }
    const years = experience.trim() ? Number(experience.replace(',', '.')) : null;
    if (years !== null && (!Number.isFinite(years) || years < 0 || years > 70)) {
      Alert.alert('Expérience invalide', 'Indiquez un nombre d’années entre 0 et 70.');
      return;
    }
    setSaving(true);
    try {
      await updateUser({
        patch: {
          name: name.trim(),
          headline: text(headline),
          city: text(city),
          country: text(country),
          field: text(field),
          bio: text(bio),
          skills: list(skills, /,/),
          roles: list(roles, /,/),
          journey: list(journey, /\n/),
          experienceYears: years,
          status,
          isServiceProvider,
          isPublic,
          showEmail,
        },
      });
      router.back();
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, "L'enregistrement a échoué."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ImagesSection user={user} />

          <Group title="Identité" icon="person-outline">
            <FormField label="Nom *" value={name} onChangeText={setName} maxLength={100} />
            <FormField
              label="Titre"
              placeholder="Ex : Développeuse web à Berlin"
              value={headline}
              onChangeText={setHeadline}
              maxLength={120}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <FormField label="Ville" value={city} onChangeText={setCity} maxLength={100} />
              </View>
              <View style={styles.flex}>
                <FormField label="Pays" value={country} onChangeText={setCountry} maxLength={100} />
              </View>
            </View>
            <FormField
              label="À propos"
              value={bio}
              onChangeText={setBio}
              maxLength={MAX_BIO}
              multiline
              hint={`${bio.length}/${MAX_BIO}`}
            />
          </Group>

          <Group title="Parcours professionnel" icon="briefcase-outline">
            <View style={styles.field}>
              <ThemedText type="smallBold">Situation</ThemedText>
              <Segmented options={statusOptions} value={status} onChange={setStatus} />
            </View>
            <FormField label="Domaine" placeholder="Ex : Informatique, Santé…" value={field} onChangeText={setField} maxLength={100} />
            <FormField
              label="Années d’expérience"
              keyboardType="number-pad"
              value={experience}
              onChangeText={setExperience}
            />
            <FormField label="Compétences" hint="Séparées par des virgules." value={skills} onChangeText={setSkills} />
            <FormField label="Rôles" hint="Séparés par des virgules. Ex : Mentor, Bénévole" value={roles} onChangeText={setRoles} />
            <FormField
              label="Étapes du parcours"
              hint="Une étape par ligne."
              value={journey}
              onChangeText={setJourney}
              multiline
            />
          </Group>

          <CvSection hasCv={Boolean(user.cv)} />

          <Group title="Confidentialité" icon="shield-checkmark-outline">
            <Toggle
              label="Profil public"
              description="Visible par les autres membres et dans les résultats."
              value={isPublic}
              onChange={setIsPublic}
            />
            <Toggle
              label="Afficher mon e-mail"
              description="Votre adresse apparaît sur votre profil public."
              value={showEmail}
              onChange={setShowEmail}
            />
            <Toggle
              label="Je propose des services"
              description="Affiche le badge Prestataire sur votre profil."
              value={isServiceProvider}
              onChange={setIsServiceProvider}
            />
          </Group>

          <Button label="Enregistrer" icon="checkmark" size="md" primary loading={saving} onPress={save} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function ImagesSection({ user }: { user: User }) {
  const theme = useTheme();
  // getCurrentUser resolves the avatar; the public profile also resolves the cover.
  const publicProfile = useQuery(api.auth.users.getUserBySlug, user.slug ? { slug: user.slug } : 'skip');
  const replaceProfileImage = useMutation(api.integrations.r2.replaceProfileImage);
  const generateAvatarUrl = useMutation(api.integrations.r2.generatePdpUploadUrl);
  const generateCoverUrl = useMutation(api.integrations.r2.generatePdcUploadUrl);
  const syncMetadata = useAction(api.integrations.r2.syncMetadata);
  const [busy, setBusy] = useState<'profile' | 'cover' | null>(null);
  const [preview, setPreview] = useState<{ profile?: string; cover?: string }>({});

  async function change(imageType: 'profile' | 'cover') {
    try {
      const [uri] = await pickPhotos({
        limit: 1,
        maxWidth: imageType === 'profile' ? 600 : 1600,
        aspect: imageType === 'profile' ? [1, 1] : [3, 1],
      });
      if (!uri) return;
      setBusy(imageType);
      const key = await uploadLocalFile(
        { uri, mimeType: 'image/jpeg' as const },
        imageType === 'profile' ? generateAvatarUrl : generateCoverUrl,
        syncMetadata,
      );
      await replaceProfileImage({ key, imageType });
      setPreview((current) => ({ ...current, [imageType]: uri }));
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, "L'envoi de l'image a échoué."));
    } finally {
      setBusy(null);
    }
  }

  const cover = preview.cover ?? publicProfile?.coverImage ?? undefined;
  const avatar = preview.profile ?? user.image ?? undefined;

  return (
    <Card padded={false} style={styles.imagesCard}>
      <Pressable onPress={() => change('cover')} accessibilityLabel="Changer la photo de couverture">
        {cover ? (
          <Image source={cover} style={[styles.cover, { backgroundColor: theme.muted }]} contentFit="cover" />
        ) : (
          <View style={[styles.cover, styles.coverEmpty, { backgroundColor: theme.primarySoft }]}>
            <Icon name="image-outline" size={24} themeColor="primaryText" />
            <ThemedText type="small" themeColor="primaryText">
              Ajouter une couverture
            </ThemedText>
          </View>
        )}
      </Pressable>
      <View style={styles.imagesBody}>
        <Pressable
          onPress={() => change('profile')}
          accessibilityLabel="Changer la photo de profil"
          style={[styles.avatarRing, { backgroundColor: theme.card }]}>
          <Avatar uri={avatar} name={user.name} size={80} />
          <View style={[styles.cameraBadge, { backgroundColor: theme.primary, borderColor: theme.card }]}>
            <Icon name="camera" size={14} color={theme.primaryForeground} />
          </View>
        </Pressable>
        <View style={styles.imageButtons}>
          <Button
            label="Photo de profil"
            icon="person-circle-outline"
            size="sm"
            loading={busy === 'profile'}
            disabled={busy !== null}
            onPress={() => change('profile')}
          />
          <Button
            label="Couverture"
            icon="image-outline"
            size="sm"
            loading={busy === 'cover'}
            disabled={busy !== null}
            onPress={() => change('cover')}
          />
        </View>
      </View>
    </Card>
  );
}

function CvSection({ hasCv }: { hasCv: boolean }) {
  const cvUrl = useQuery(api.integrations.r2.getCvUrl);
  const generateUrl = useMutation(api.integrations.r2.generateCvUploadUrl);
  const syncMetadata = useAction(api.integrations.r2.syncMetadata);
  const uploadCvAndDeleteOld = useMutation(api.integrations.r2.uploadCvAndDeleteOld);
  const deleteCv = useMutation(api.integrations.r2.deleteCv);
  const [busy, setBusy] = useState(false);

  async function upload() {
    const result = await DocumentPicker.getDocumentAsync({ type: PDF, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size !== undefined && asset.size > MAX_CV_SIZE) {
      Alert.alert('Fichier trop lourd', 'Le CV doit faire 5 Mo maximum.');
      return;
    }
    setBusy(true);
    try {
      const key = await uploadLocalFile({ uri: asset.uri, mimeType: PDF }, generateUrl, syncMetadata);
      await uploadCvAndDeleteOld({ newCvKey: key });
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, "L'envoi du CV a échoué."));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    Alert.alert('Supprimer votre CV ?', 'Les candidatures déjà envoyées le conservent.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteCv();
          } catch (error) {
            Alert.alert('Erreur', errorMessage(error, 'La suppression a échoué.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  const present = Boolean(cvUrl) || hasCv;
  return (
    <Group title="CV" icon="document-text-outline">
      <ThemedText type="small" themeColor="textSecondary">
        {present
          ? 'Votre CV est proposé automatiquement quand vous postulez.'
          : 'Ajoutez un CV en PDF (5 Mo max.) pour postuler plus vite.'}
      </ThemedText>
      <View style={styles.imageButtons}>
        {cvUrl ? (
          <Button label="Voir" icon="eye-outline" size="sm" onPress={() => WebBrowser.openBrowserAsync(cvUrl)} />
        ) : null}
        <Button
          label={present ? 'Remplacer' : 'Ajouter mon CV'}
          icon="cloud-upload-outline"
          size="sm"
          primary={!present}
          loading={busy}
          onPress={upload}
        />
        {present ? <Button label="Supprimer" icon="trash-outline" size="sm" variant="ghost" disabled={busy} onPress={remove} /> : null}
      </View>
    </Group>
  );
}

function Group({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <Card style={styles.group}>
      <View style={styles.groupTitle}>
        <Icon name={icon} size={18} themeColor="primaryText" />
        <ThemedText type="heading">{title}</ThemedText>
      </View>
      {children}
    </Card>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.border }}
        accessibilityLabel={label}
      />
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
  row: { flexDirection: 'row', gap: Spacing.two },
  field: { gap: Spacing.two },
  group: { gap: Spacing.three },
  groupTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  imagesCard: { overflow: 'hidden' },
  cover: { width: '100%', height: 120 },
  coverEmpty: { alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  imagesBody: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three, padding: Spacing.three, paddingTop: 0 },
  avatarRing: { padding: 4, borderRadius: Radius.full, marginTop: -Spacing.five },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtons: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
