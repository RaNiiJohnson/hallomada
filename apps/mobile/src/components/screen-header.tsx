import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountButton } from './account-button';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

/** Large title used at the top of each tab, with optional actions and the account shortcut. */
export function ScreenHeader({
  title,
  subtitle,
  actions,
  account = true,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Show the avatar that opens the account screen. */
  account?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.text}>
          <ThemedText type="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {actions || account ? (
          <View style={styles.actions}>
            {actions}
            {account ? <AccountButton /> : null}
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { flex: 1, gap: Spacing.half },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
