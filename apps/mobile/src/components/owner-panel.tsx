import type { PublicationStatus } from '@hallomada/shared/publication-lifecycle';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { Badge, type BadgeTone } from './badge';
import { Button } from './button';
import { Card } from './card';
import { SectionTitle } from './detail';
import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { publicationStatusLabels } from '@/lib/status-labels';
import { timeAgo } from '@/lib/time';

const statusTone: Record<PublicationStatus, BadgeTone> = {
  pending: 'warning',
  active: 'primary',
  rejected: 'danger',
  closed: 'neutral',
  archived: 'neutral',
};

/** Owners never move a publication to `rejected`; only moderation does. */
export type OwnerStatus = Exclude<PublicationStatus, 'rejected'>;

type Transition = { next: OwnerStatus; label: string; icon: IconName; confirm?: string; destructive?: boolean };

/** Lifecycle moves an owner can make, mirroring isAllowedPublicationTransition. */
function transitions(status: PublicationStatus, noun: string): Transition[] {
  switch (status) {
    case 'active':
      return [{ next: 'closed', label: 'Clôturer', icon: 'lock-closed-outline', confirm: `Clôturer cette ${noun} ? Elle ne sera plus visible publiquement.` }];
    case 'closed':
      return [
        { next: 'active', label: 'Réactiver', icon: 'refresh-outline' },
        { next: 'archived', label: 'Archiver', icon: 'archive-outline', destructive: true, confirm: `Archiver cette ${noun} ?` },
      ];
    case 'pending':
    case 'rejected':
      return [{ next: 'archived', label: 'Retirer', icon: 'archive-outline', destructive: true, confirm: `Retirer cette ${noun} ?` }];
    case 'archived':
      return [{ next: 'pending', label: 'Republier', icon: 'arrow-redo-outline' }];
  }
}

/** Status card shown to the author of a job or listing, with lifecycle actions. */
export function OwnerPanel({
  status = 'active',
  noun,
  onSetStatus,
  onEdit,
}: {
  status?: PublicationStatus;
  noun: 'offre' | 'annonce';
  onSetStatus: (next: OwnerStatus) => Promise<unknown>;
  onEdit?: () => void;
}) {
  const [pending, setPending] = useState<OwnerStatus | null>(null);

  const run = async (transition: Transition) => {
    setPending(transition.next);
    try {
      await onSetStatus(transition.next);
    } catch (error) {
      Alert.alert('Erreur', errorMessage(error, 'Le changement de statut a échoué.'));
    } finally {
      setPending(null);
    }
  };

  const press = (transition: Transition) => {
    if (!transition.confirm) return void run(transition);
    Alert.alert(transition.confirm, undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: transition.label, style: transition.destructive ? 'destructive' : 'default', onPress: () => void run(transition) },
    ]);
  };

  return (
    <Card style={styles.panel}>
      <View style={styles.row}>
        <Icon name="person-circle-outline" size={20} themeColor="primaryText" />
        <ThemedText type="smallBold" style={styles.flex}>
          Votre {noun}
        </ThemedText>
        <Badge label={publicationStatusLabels[status] ?? status} tone={statusTone[status]} />
      </View>
      <View style={styles.actions}>
        {onEdit ? <Button label="Modifier" icon="create-outline" size="sm" onPress={onEdit} /> : null}
        {transitions(status, noun).map((transition) => (
          <Button
            key={transition.next}
            label={transition.label}
            icon={transition.icon}
            size="sm"
            variant={transition.destructive ? 'ghost' : 'outline'}
            loading={pending === transition.next}
            disabled={pending !== null}
            onPress={() => press(transition)}
          />
        ))}
      </View>
    </Card>
  );
}

export type ReceivedRow = {
  _id: string;
  name: string | null;
  slug: string | null;
  at: number;
  highlighted: boolean;
  message: string | null;
  link: { label: string; url: string; icon: IconName } | null;
};

/** Applications or rental dossiers received by the author, highlighted first. */
export function ReceivedList({
  title,
  rows,
  empty,
  closedHint,
}: {
  title: string;
  rows: ReceivedRow[] | null | undefined;
  empty: string;
  closedHint: string;
}) {
  if (rows === null) return null;
  return (
    <View style={styles.received}>
      <SectionTitle title={rows ? `${title} (${rows.length})` : title} icon="file-tray-full-outline" />
      {rows === undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          Chargement…
        </ThemedText>
      ) : rows.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {empty}
          </ThemedText>
        </Card>
      ) : (
        rows.map((row) => <ReceivedItem key={row._id} row={row} closedHint={closedHint} />)
      )}
    </View>
  );
}

function ReceivedItem({ row, closedHint }: { row: ReceivedRow; closedHint: string }) {
  const router = useRouter();
  const theme = useTheme();
  const name = row.name ?? 'Candidat';
  const header: ReactNode = (
    <View style={styles.row}>
      <Avatar name={name} size={36} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {timeAgo(row.at)}
        </ThemedText>
      </View>
      {row.highlighted ? <Badge label="Mise en avant" tone="warning" icon="star" /> : null}
    </View>
  );
  return (
    <Card style={[styles.item, row.highlighted && { borderColor: theme.warning }]}>
      {row.slug ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/profiles/[slug]', params: { slug: row.slug! } })}>
          {header}
        </Pressable>
      ) : (
        header
      )}
      {row.message ? (
        <ThemedText type="small" numberOfLines={6}>
          {row.message}
        </ThemedText>
      ) : null}
      {row.link ? (
        <Button
          label={row.link.label}
          icon={row.link.icon}
          size="sm"
          variant="outline"
          style={styles.linkButton}
          onPress={() => WebBrowser.openBrowserAsync(row.link!.url)}
        />
      ) : (
        <ThemedText type="caption" themeColor="textSecondary">
          {closedHint}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  received: { gap: Spacing.two },
  item: { gap: Spacing.two },
  linkButton: { alignSelf: 'flex-start' },
});
