import { api } from '@convex/_generated/api';
import type { Doc, Id } from '@convex/_generated/dataModel';
import {
  MAX_HOUSEHOLD_SIZE,
  MAX_RENTAL_ABOUT,
  MAX_RENTAL_DOCUMENT_SIZE,
  MAX_RENTAL_DOCUMENTS,
  MAX_RENTAL_INCOME,
  MAX_RENTAL_TEXT,
  RENTAL_DOCUMENT_CATEGORIES,
} from '@convex/rentalFiles/values';
import { useAction, useMutation, useQuery } from 'convex/react';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Banner, CenteredMessage, LoadingScreen } from '@/components/detail';
import { FormField } from '@/components/form-field';
import { Icon, type IconName } from '@/components/icon';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, parseDateOnly, parseNumber } from '@/lib/errors';
import { formatDate } from '@/lib/job-labels';
import { uploadLocalFile } from '@/lib/upload';

type Category = (typeof RENTAL_DOCUMENT_CATEGORIES)[number];
type DocumentContentType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
const ACCEPTED: DocumentContentType[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const categories: Record<Category, { label: string; hint: string; icon: IconName }> = {
  id: { label: 'Pièce d’identité', hint: 'Passeport ou carte d’identité, recto-verso.', icon: 'id-card-outline' },
  payslip: { label: 'Fiches de paie', hint: 'Les 3 dernières (Gehaltsnachweise).', icon: 'cash-outline' },
  schufa: { label: 'SCHUFA', hint: 'Auto-information SCHUFA récente (SCHUFA-Auskunft).', icon: 'shield-checkmark-outline' },
  rentDebtFree: {
    label: 'Attestation de l’ancien propriétaire',
    hint: 'Mietschuldenfreiheitsbescheinigung : aucun loyer impayé.',
    icon: 'home-outline',
  },
  employment: { label: 'Contrat de travail', hint: 'Ou attestation d’employeur, d’études, de bourse…', icon: 'briefcase-outline' },
  other: { label: 'Autres documents', hint: 'Garant, lettre de recommandation, etc.', icon: 'documents-outline' },
};

type Tri = 'unset' | 'yes' | 'no';
const triOptions: { value: Tri; label: string }[] = [
  { value: 'unset', label: 'Non précisé' },
  { value: 'yes', label: 'Oui' },
  { value: 'no', label: 'Non' },
];
const toTri = (value?: boolean): Tri => (value === undefined ? 'unset' : value ? 'yes' : 'no');
const fromTri = (value: Tri) => (value === 'unset' ? undefined : value === 'yes');

export default function RentalDossierScreen() {
  const mine = useQuery(api.rentalFiles.queries.getMine);
  if (mine === undefined) return <LoadingScreen />;
  if (mine === null) {
    return <CenteredMessage icon="folder-open-outline" title="Connexion requise" description="Connectez-vous pour préparer votre dossier." />;
  }
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Intro documentCount={mine.documents.length} hasProfile={mine.profile !== null} />
          <DocumentsSection documents={mine.documents} />
          <ProfileSection profile={mine.profile} />
          <SentSection sent={mine.sent} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

function Intro({ documentCount, hasProfile }: { documentCount: number; hasProfile: boolean }) {
  const theme = useTheme();
  const steps = [
    { done: documentCount > 0, label: documentCount > 0 ? `${documentCount} justificatif${documentCount > 1 ? 's' : ''}` : 'Ajoutez vos justificatifs' },
    { done: hasProfile, label: hasProfile ? 'Informations renseignées' : 'Complétez vos informations' },
  ];
  return (
    <Card style={[styles.intro, { backgroundColor: theme.primarySoft, borderColor: theme.primarySoft }]}>
      <View style={styles.row}>
        <Icon name="folder-open" size={22} themeColor="primaryText" />
        <ThemedText type="heading" themeColor="primaryText" style={styles.flex}>
          Votre dossier, prêt en un clic
        </ThemedText>
      </View>
      <ThemedText type="small">
        Préparez-le une fois, puis envoyez-le aux annonces de location qui l’acceptent. Les propriétaires y accèdent par un lien
        privé valable 30 jours.
      </ThemedText>
      <View style={styles.steps}>
        {steps.map((step) => (
          <View key={step.label} style={styles.row}>
            <Icon
              name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              themeColor={step.done ? 'primaryText' : 'textSecondary'}
            />
            <ThemedText type="small">{step.label}</ThemedText>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Group({ title, description, icon, children }: { title: string; description?: string; icon: IconName; children: ReactNode }) {
  return (
    <Card style={styles.group}>
      <View style={styles.row}>
        <Icon name={icon} size={18} themeColor="primaryText" />
        <ThemedText type="heading" style={styles.flex}>
          {title}
        </ThemedText>
      </View>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      ) : null}
      {children}
    </Card>
  );
}

function DocumentsSection({ documents }: { documents: Doc<'rentalDocuments'>[] }) {
  const full = documents.length >= MAX_RENTAL_DOCUMENTS;
  return (
    <Group title="Mes justificatifs" icon="document-attach-outline" description="PDF, JPG, PNG ou WebP, 10 Mo maximum par fichier.">
      <Banner
        tone="info"
        icon="lock-closed-outline"
        title="Documents privés"
        description="Visibles uniquement par les propriétaires à qui vous envoyez votre dossier. Masquez ce qui n’est pas nécessaire, comme le numéro de pièce d’identité."
      />
      {RENTAL_DOCUMENT_CATEGORIES.map((category) => (
        <CategoryBlock
          key={category}
          category={category}
          documents={documents.filter((document) => document.category === category)}
          full={full}
        />
      ))}
      {full ? (
        <ThemedText type="small" themeColor="textSecondary">
          Vous avez atteint la limite de {MAX_RENTAL_DOCUMENTS} documents.
        </ThemedText>
      ) : null}
    </Group>
  );
}

function CategoryBlock({ category, documents, full }: { category: Category; documents: Doc<'rentalDocuments'>[]; full: boolean }) {
  const theme = useTheme();
  const generateUrl = useMutation(api.integrations.r2.generateRentalDocumentUploadUrl);
  const syncMetadata = useAction(api.integrations.r2.syncMetadata);
  const attach = useMutation(api.rentalFiles.mutations.attachDocument);
  const remove = useMutation(api.rentalFiles.mutations.removeDocument);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<Id<'rentalDocuments'> | null>(null);
  const meta = categories[category];

  async function add() {
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = ACCEPTED.find((type) => type === asset.mimeType);
    if (!mimeType) {
      Alert.alert('Format non pris en charge', 'Choisissez un PDF, JPG, PNG ou WebP.');
      return;
    }
    if (asset.size !== undefined && asset.size > MAX_RENTAL_DOCUMENT_SIZE) {
      Alert.alert('Fichier trop lourd', 'Ce fichier dépasse 10 Mo.');
      return;
    }
    setUploading(true);
    try {
      const key = await uploadLocalFile({ uri: asset.uri, mimeType }, generateUrl, syncMetadata);
      await attach({ key, category, fileName: asset.name });
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, 'Impossible d’ajouter le document. Réessayez.'));
    } finally {
      setUploading(false);
    }
  }

  function confirmRemove(document: Doc<'rentalDocuments'>) {
    Alert.alert('Supprimer ce document ?', `« ${document.fileName} » disparaîtra aussi des dossiers déjà envoyés.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setRemoving(document._id);
          try {
            await remove({ id: document._id });
          } catch (error) {
            Alert.alert('Erreur', errorMessage(error, 'La suppression a échoué.'));
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.category, { borderColor: theme.border }]}>
      <View style={styles.row}>
        <View style={[styles.categoryIcon, { backgroundColor: documents.length ? theme.primarySoft : theme.muted }]}>
          <Icon name={meta.icon} size={18} themeColor={documents.length ? 'primaryText' : 'textSecondary'} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{meta.label}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {meta.hint}
          </ThemedText>
        </View>
        <Button label="Ajouter" icon="add" size="sm" loading={uploading} disabled={full} onPress={add} />
      </View>
      {documents.map((document) => (
        <View key={document._id} style={[styles.file, { backgroundColor: theme.muted }]}>
          <Icon
            name={document.contentType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
            size={18}
            themeColor="textSecondary"
          />
          <View style={styles.flex}>
            <ThemedText type="small" numberOfLines={1}>
              {document.fileName}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Ajouté le {formatDate(document.uploadedAt)}
            </ThemedText>
          </View>
          <IconButton
            icon="trash-outline"
            tone="plain"
            size={40}
            label={`Supprimer ${document.fileName}`}
            onPress={() => (removing ? undefined : confirmRemove(document))}
          />
        </View>
      ))}
    </View>
  );
}

function ProfileSection({ profile }: { profile: Doc<'rentalFiles'> | null }) {
  const save = useMutation(api.rentalFiles.mutations.saveProfile);
  const [occupation, setOccupation] = useState(profile?.occupation ?? '');
  const [employer, setEmployer] = useState(profile?.employer ?? '');
  const [income, setIncome] = useState(profile?.netMonthlyIncome != null ? String(profile.netMonthlyIncome) : '');
  const [household, setHousehold] = useState(profile?.householdSize != null ? String(profile.householdSize) : '');
  const [moveIn, setMoveIn] = useState(profile?.moveInDate ?? '');
  const [pets, setPets] = useState<Tri>(toTri(profile?.pets));
  const [smoker, setSmoker] = useState<Tri>(toTri(profile?.smoker));
  const [about, setAbout] = useState(profile?.about ?? '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const netMonthlyIncome = parseNumber(income);
    if (netMonthlyIncome === null || (netMonthlyIncome !== undefined && (netMonthlyIncome < 0 || netMonthlyIncome > MAX_RENTAL_INCOME))) {
      Alert.alert('Revenu invalide', 'Indiquez un montant en euros.');
      return;
    }
    const householdSize = parseNumber(household);
    if (
      householdSize === null ||
      (householdSize !== undefined && (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > MAX_HOUSEHOLD_SIZE))
    ) {
      Alert.alert('Nombre de personnes invalide', `Indiquez un nombre entre 1 et ${MAX_HOUSEHOLD_SIZE}.`);
      return;
    }
    const moveInDate = parseDateOnly(moveIn);
    if (moveInDate === null) {
      Alert.alert('Date invalide', 'La date doit être au format AAAA-MM-JJ.');
      return;
    }
    setSaving(true);
    try {
      await save({
        profile: {
          occupation: occupation.trim() || undefined,
          employer: employer.trim() || undefined,
          netMonthlyIncome,
          householdSize,
          moveInDate,
          pets: fromTri(pets),
          smoker: fromTri(smoker),
          about: about.trim() || undefined,
        },
      });
      Alert.alert('Informations enregistrées');
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, 'Impossible d’enregistrer. Vérifiez les champs.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Group
      title="Mes informations"
      icon="person-outline"
      description="L’équivalent de la « Mieterselbstauskunft ». Tous les champs sont facultatifs.">
      <View style={styles.pair}>
        <View style={styles.flex}>
          <FormField label="Profession" value={occupation} onChangeText={setOccupation} maxLength={MAX_RENTAL_TEXT} />
        </View>
        <View style={styles.flex}>
          <FormField label="Employeur" value={employer} onChangeText={setEmployer} maxLength={MAX_RENTAL_TEXT} />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <FormField label="Revenu net (€/mois)" keyboardType="decimal-pad" value={income} onChangeText={setIncome} />
        </View>
        <View style={styles.flex}>
          <FormField label="Personnes" keyboardType="number-pad" value={household} onChangeText={setHousehold} />
        </View>
      </View>
      <FormField
        label="Emménagement souhaité"
        placeholder="AAAA-MM-JJ"
        hint="Format AAAA-MM-JJ, ex. 2027-01-01"
        value={moveIn}
        onChangeText={setMoveIn}
        autoCapitalize="none"
      />
      <View style={styles.field}>
        <ThemedText type="smallBold">Animaux</ThemedText>
        <Segmented options={triOptions} value={pets} onChange={setPets} />
      </View>
      <View style={styles.field}>
        <ThemedText type="smallBold">Fumeur</ThemedText>
        <Segmented options={triOptions} value={smoker} onChange={setSmoker} />
      </View>
      <FormField
        label="Quelques mots sur vous"
        placeholder="Présentez-vous en quelques lignes au propriétaire."
        value={about}
        onChangeText={setAbout}
        maxLength={MAX_RENTAL_ABOUT}
        multiline
        hint={`${about.length}/${MAX_RENTAL_ABOUT}`}
      />
      <Button label="Enregistrer" icon="checkmark" primary loading={saving} onPress={submit} />
    </Group>
  );
}

type Sent = { _id: Id<'rentalApplications'>; sentAt: number; expiresAt: number; revoked: boolean; listing: { title: string; slug: string } | null };

function SentSection({ sent }: { sent: Sent[] }) {
  return (
    <Group
      title="Envoyé à"
      icon="paper-plane-outline"
      description="Les propriétaires voient toujours la version actuelle de votre dossier. Un document supprimé disparaît aussi de leur côté.">
      {sent.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Vous n’avez encore envoyé votre dossier à aucune annonce.
        </ThemedText>
      ) : (
        sent.map((item) => <SentRow key={item._id} item={item} />)
      )}
    </Group>
  );
}

function SentRow({ item }: { item: Sent }) {
  const router = useRouter();
  const theme = useTheme();
  const revokeAccess = useMutation(api.rentalFiles.mutations.revokeAccess);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const open = !item.revoked && item.expiresAt > now;

  function revoke() {
    Alert.alert('Retirer l’accès ?', 'Le propriétaire ne pourra plus ouvrir votre dossier.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await revokeAccess({ applicationId: item._id });
          } catch (error) {
            Alert.alert('Erreur', errorMessage(error, 'Une erreur est survenue. Réessayez.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.sent, { borderColor: theme.border }]}>
      <View style={styles.row}>
        <Icon name="home-outline" size={18} themeColor="textSecondary" />
        <View style={styles.flex}>
          {item.listing ? (
            <ThemedText
              type="smallBold"
              numberOfLines={2}
              onPress={() => router.push({ pathname: '/listings/[slug]', params: { slug: item.listing!.slug } })}>
              {item.listing.title}
            </ThemedText>
          ) : (
            <ThemedText type="smallBold" themeColor="textSecondary">
              Annonce supprimée
            </ThemedText>
          )}
          <ThemedText type="caption" themeColor="textSecondary">
            Envoyé le {formatDate(item.sentAt)}
            {open ? ` · accès jusqu’au ${formatDate(item.expiresAt)}` : ''}
          </ThemedText>
        </View>
        {open ? null : <Badge label="Accès terminé" />}
      </View>
      {open ? (
        <Button
          label="Retirer l’accès"
          icon="close-circle-outline"
          size="sm"
          variant="ghost"
          loading={busy}
          style={styles.start}
          onPress={revoke}
        />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  intro: { gap: Spacing.two },
  steps: { gap: Spacing.one, marginTop: Spacing.one },
  group: { gap: Spacing.three },
  field: { gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.two },
  category: { gap: Spacing.two, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  categoryIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  file: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingLeft: Spacing.three, borderRadius: Radius.md },
  sent: { gap: Spacing.two, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  start: { alignSelf: 'flex-start' },
});
