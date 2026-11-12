import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormField } from '@/components/form-field';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import type { ReportTargetType } from '@/components/report-button';

type Reason = 'spam' | 'fraud' | 'harassment' | 'hate' | 'dangerous' | 'misinformation' | 'other';

const reasons: { value: Reason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Fraude ou faux contenu' },
  { value: 'harassment', label: 'Harcèlement' },
  { value: 'hate', label: 'Contenu haineux' },
  { value: 'dangerous', label: 'Contenu dangereux ou illégal' },
  { value: 'misinformation', label: 'Information trompeuse' },
  { value: 'other', label: 'Autre' },
];

function toTarget(type: ReportTargetType, id: string) {
  switch (type) {
    case 'post':
      return { type, id: id as Id<'posts'> };
    case 'job':
      return { type, id: id as Id<'JobOffer'> };
    case 'listing':
      return { type, id: id as Id<'RealestateListing'> };
    case 'community':
      return { type, id: id as Id<'communities'> };
    case 'provider':
      return { type, id: id as Id<'providers'> };
  }
}

export default function ReportScreen() {
  const { type, id, title } = useLocalSearchParams<{ type: ReportTargetType; id: string; title?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const create = useMutation(api.reports.create);
  const [reason, setReason] = useState<Reason>();
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await create({ target: toTarget(type, id), reason, details: details.trim() || undefined });
      router.back();
      Alert.alert('Merci', 'Signalement envoyé à la modération.');
    } catch (error) {
      Alert.alert(
        'Signalement impossible',
        errorMessage(error, "Impossible d'envoyer le signalement. Il a peut-être déjà été transmis."),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            {title ? (
              <ThemedText type="heading" numberOfLines={2}>
                {title}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              Aidez l’équipe de modération à comprendre le problème. Le signalement reste confidentiel.
            </ThemedText>
          </View>
          <Card padded={false}>
            {reasons.map((option, index) => {
              const selected = option.value === reason;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setReason(option.value)}
                  style={[
                    styles.reason,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                  ]}>
                  <ThemedText style={styles.flex}>{option.label}</ThemedText>
                  <Icon
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? theme.primary : theme.textSecondary}
                  />
                </Pressable>
              );
            })}
          </Card>
          <FormField
            label="Précisions (facultatif)"
            placeholder="Ajoutez uniquement les éléments utiles à la modération."
            multiline
            maxLength={1000}
            value={details}
            onChangeText={setDetails}
          />
          <Button
            label="Envoyer le signalement"
            icon="flag-outline"
            variant="destructive"
            size="md"
            loading={sending}
            disabled={!reason || sending}
            onPress={submit}
          />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  intro: { gap: Spacing.one },
  reason: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
});
