import { MAX_LENGTH } from '@convex/utils/limits';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { FormField } from './form-field';
import { Segmented } from './segmented';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const MAX_LABEL = 60;
const MAX_RULES = 1000;

export type CommunityValues = { name: string; description: string; city?: string; theme?: string; rules?: string };

/** Create/edit form for a community anchored to exactly one city or theme. */
export function CommunityForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: CommunityValues;
  submitLabel: string;
  onSubmit: (values: CommunityValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [kind, setKind] = useState<'city' | 'theme'>(initial?.theme ? 'theme' : 'city');
  const [label, setLabel] = useState(initial?.city ?? initial?.theme ?? '');
  const [rules, setRules] = useState(initial?.rules ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Donnez un nom à la communauté.';
    if (!description.trim()) next.description = 'Ajoutez une description.';
    if (!label.trim()) next.label = kind === 'city' ? 'Indiquez la ville.' : 'Indiquez le thème.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        ...(kind === 'city' ? { city: label.trim() } : { theme: label.trim() }),
        rules: rules.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormField
            label="Nom"
            placeholder="Malagasy à Berlin"
            value={name}
            onChangeText={setName}
            maxLength={MAX_LENGTH.name}
            error={errors.name}
          />
          <FormField
            label="Description"
            placeholder="À qui s’adresse cette communauté ?"
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_LENGTH.shortText}
            multiline
            error={errors.description}
          />
          <View style={styles.field}>
            <ThemedText type="smallBold">Communauté basée sur</ThemedText>
            <Segmented
              options={[
                { value: 'city' as const, label: 'Une ville' },
                { value: 'theme' as const, label: 'Un thème' },
              ]}
              value={kind}
              onChange={setKind}
            />
          </View>
          <FormField
            label={kind === 'city' ? 'Ville' : 'Thème'}
            placeholder={kind === 'city' ? 'Berlin' : 'Cuisine, études, sport…'}
            value={label}
            onChangeText={setLabel}
            maxLength={MAX_LABEL}
            error={errors.label}
          />
          <FormField
            label="Règles (facultatif)"
            placeholder="Respect, pas de spam…"
            hint={`${rules.length}/${MAX_RULES}`}
            value={rules}
            onChangeText={setRules}
            maxLength={MAX_RULES}
            multiline
          />
          <Button label={submitLabel} icon="checkmark" size="md" primary loading={saving} onPress={submit} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  field: { gap: Spacing.one + 2 },
});
