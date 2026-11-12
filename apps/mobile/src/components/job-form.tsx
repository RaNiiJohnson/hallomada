import type { api } from '@convex/_generated/api';
import type { FunctionArgs } from 'convex/server';
import {
  type ContractType,
  type JobType,
  jobTypeHasContract,
  jobTypeValues,
  requiresDurationOrStartDate,
  showsWeeklyHours,
  type WorkMode,
  type WorkTime,
} from '@hallomada/shared/job-offer-options';
import { MAX_LENGTH } from '@convex/utils/limits';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { FormField } from './form-field';
import { Segmented } from './segmented';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { parseDateOnly, parseNumber } from '@/lib/errors';
import { jobTypeLabel, workModeLabel } from '@/lib/job-labels';

type SalaryPeriod = 'hour' | 'month' | 'year';

const typeOptions = jobTypeValues.map((value) => ({ value, label: jobTypeLabel(value) }));
const contractOptions: { value: ContractType; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
];
const workTimeOptions: { value: WorkTime; label: string }[] = [
  { value: 'fullTime', label: 'Temps plein' },
  { value: 'partTime', label: 'Temps partiel' },
];
const workModeOptions = (['onSite', 'hybrid', 'remote'] as WorkMode[]).map((value) => ({
  value,
  label: workModeLabel(value),
}));
const periodOptions: { value: SalaryPeriod | undefined; label: string }[] = [
  { value: undefined, label: 'Non précisé' },
  { value: 'hour', label: 'Par heure' },
  { value: 'month', label: 'Par mois' },
  { value: 'year', label: 'Par an' },
];

export type JobValues = FunctionArgs<typeof api.jobs.mutations.createJob>;

/** Create/edit form for a job offer; `initial` prefills it from an existing offer. */
export function JobForm({
  initial,
  initialEmail,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<JobValues>;
  initialEmail: string;
  submitLabel: string;
  onSubmit: (values: JobValues) => Promise<void>;
}) {
  const text = (value: string | number | undefined) => (value === undefined ? '' : String(value));
  const [type, setType] = useState<JobType>(initial?.type ?? 'job');
  const [contractType, setContractType] = useState<ContractType | undefined>(initial?.contractType);
  const [workTime, setWorkTime] = useState<WorkTime | undefined>(initial?.workTime);
  const [workMode, setWorkMode] = useState<WorkMode>(initial?.workMode ?? 'onSite');
  const [title, setTitle] = useState(text(initial?.title));
  const [company, setCompany] = useState(text(initial?.company));
  const [city, setCity] = useState(text(initial?.city));
  const [remoteLocation, setRemoteLocation] = useState(text(initial?.remoteLocation));
  const [duration, setDuration] = useState(text(initial?.duration));
  const [startDate, setStartDate] = useState(text(initial?.startDate));
  const [deadline, setDeadline] = useState(text(initial?.applicationDeadline));
  const [weeklyHours, setWeeklyHours] = useState(text(initial?.weeklyHours));
  const [salary, setSalary] = useState(text(initial?.salary));
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod | undefined>(initial?.salaryPeriod);
  const [sector, setSector] = useState(text(initial?.sector));
  const [description, setDescription] = useState(text(initial?.description));
  const [benefits, setBenefits] = useState(text(initial?.benefits));
  const [externalUrl, setExternalUrl] = useState(text(initial?.externalApplicationUrl));
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);

  const hasContract = jobTypeHasContract(type);
  const needsDates = requiresDurationOrStartDate(type, hasContract ? contractType : undefined);

  function validate() {
    if (!title.trim()) return "Le titre de l'offre est requis.";
    if (!company.trim()) return "L'entreprise est requise.";
    if (hasContract && !contractType) return 'Choisissez un type de contrat.';
    if (hasContract && !workTime) return 'Choisissez le temps de travail.';
    if (workMode !== 'remote' && !city.trim()) return 'La ville est requise.';
    if (needsDates && !duration.trim()) return 'La durée est requise.';
    if (needsDates && !startDate.trim()) return 'La date de début est requise.';
    if (parseDateOnly(startDate) === null || parseDateOnly(deadline) === null) {
      return 'Les dates doivent être au format AAAA-MM-JJ.';
    }
    if (parseNumber(salary) === null || parseNumber(weeklyHours) === null) {
      return 'Le salaire et le volume horaire doivent être des nombres.';
    }
    if (!description.trim()) return 'La description est requise.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "L'e-mail de réception des candidatures est invalide.";
    }
    return null;
  }

  async function submit() {
    const invalid = validate();
    if (invalid) {
      Alert.alert('Formulaire incomplet', invalid);
      return;
    }
    const optional = (value: string) => value.trim() || undefined;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        type,
        contractType: hasContract ? contractType : undefined,
        workTime: hasContract ? workTime : undefined,
        workMode,
        city: city.trim(),
        remoteLocation: workMode === 'remote' ? optional(remoteLocation) : undefined,
        duration: needsDates ? optional(duration) : undefined,
        startDate: needsDates ? (parseDateOnly(startDate) ?? undefined) : undefined,
        applicationDeadline: parseDateOnly(deadline) ?? undefined,
        weeklyHours: showsWeeklyHours(type) ? (parseNumber(weeklyHours) ?? undefined) : undefined,
        salary: parseNumber(salary) ?? undefined,
        salaryPeriod: parseNumber(salary) !== undefined ? salaryPeriod : undefined,
        sector: optional(sector),
        company: company.trim(),
        description: description.trim(),
        benefits: optional(benefits),
        externalApplicationUrl: optional(externalUrl),
        contactEmail: email.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Choice label="Type d'offre *">
            <Segmented options={typeOptions} value={type} onChange={setType} />
          </Choice>
          {hasContract ? (
            <>
              <Choice label="Type de contrat *">
                <Segmented options={contractOptions} value={contractType} onChange={setContractType} />
              </Choice>
              <Choice label="Temps de travail *">
                <Segmented options={workTimeOptions} value={workTime} onChange={setWorkTime} />
              </Choice>
            </>
          ) : null}
          <FormField
            label="Titre de l'offre *"
            value={title}
            onChangeText={setTitle}
            maxLength={MAX_LENGTH.title}
            placeholder="Ex : Développeur Frontend React"
          />
          <FormField
            label="Entreprise *"
            value={company}
            onChangeText={setCompany}
            maxLength={MAX_LENGTH.name}
            placeholder="Nom de l'entreprise"
          />
          <Choice label="Mode de travail *">
            <Segmented options={workModeOptions} value={workMode} onChange={setWorkMode} />
          </Choice>
          <FormField
            label={workMode === 'remote' ? 'Ville / Localité (facultatif)' : 'Ville / Localité *'}
            value={city}
            onChangeText={setCity}
            maxLength={MAX_LENGTH.name}
            placeholder="Ex : Königstein im Taunus, Hesse"
          />
          {workMode === 'remote' ? (
            <FormField
              label="Zone de résidence ou contraintes (facultatif)"
              value={remoteLocation}
              onChangeText={setRemoteLocation}
              maxLength={MAX_LENGTH.shortText}
              placeholder="Ex : Allemagne, UE ou fuseau horaire"
            />
          ) : null}
          {needsDates ? (
            <>
              <FormField
                label="Durée *"
                value={duration}
                onChangeText={setDuration}
                maxLength={MAX_LENGTH.name}
                placeholder="Ex : 6 mois, 2 ans"
              />
              <FormField
                label="Date de début *"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="AAAA-MM-JJ"
                keyboardType="numbers-and-punctuation"
              />
            </>
          ) : null}
          <FormField
            label="Date limite de candidature (facultatif)"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="AAAA-MM-JJ"
            keyboardType="numbers-and-punctuation"
          />
          {showsWeeklyHours(type) ? (
            <FormField
              label="Volume horaire hebdomadaire (facultatif)"
              value={weeklyHours}
              onChangeText={setWeeklyHours}
              keyboardType="decimal-pad"
              placeholder="Ex : 20"
            />
          ) : null}
          <FormField
            label="Salaire en € (facultatif)"
            value={salary}
            onChangeText={setSalary}
            keyboardType="decimal-pad"
            placeholder="Montant"
          />
          {salary.trim() ? (
            <Choice label="Période">
              <Segmented options={periodOptions} value={salaryPeriod} onChange={setSalaryPeriod} />
            </Choice>
          ) : null}
          <FormField
            label="Secteur / catégorie (facultatif)"
            value={sector}
            onChangeText={setSector}
            maxLength={MAX_LENGTH.name}
          />
          <FormField
            label="Description *"
            hint="Décrivez le poste, les missions et les compétences requises."
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_LENGTH.description}
            multiline
          />
          <FormField
            label="Avantages (facultatif)"
            value={benefits}
            onChangeText={setBenefits}
            maxLength={MAX_LENGTH.description}
            multiline
          />
          <FormField
            label="Lien externe de candidature (facultatif)"
            value={externalUrl}
            onChangeText={setExternalUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://"
          />
          <FormField
            label="E-mail de réception des candidatures *"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="recrutement@organisation.de"
          />
          <ThemedText type="small" themeColor="textSecondary">
            L’offre est publiée (ou republiée après modification) après validation par l’administration.
          </ThemedText>
          <Button label={submitLabel} icon="checkmark" size="md" primary loading={submitting} onPress={submit} />
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
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  choice: { gap: Spacing.two },
});
