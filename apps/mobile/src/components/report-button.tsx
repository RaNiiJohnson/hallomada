import { useConvexAuth } from 'convex/react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Button } from './button';
import { Icon } from './icon';

export type ReportTargetType = 'post' | 'job' | 'listing' | 'community' | 'provider';

/**
 * Opens the report form for a piece of content (sign-in first when needed).
 * `compact` renders a bare flag icon for icon-only action rows.
 */
export function ReportButton({
  type,
  id,
  title,
  compact,
}: {
  type: ReportTargetType;
  id: string;
  title?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const open = () =>
    isAuthenticated
      ? router.push({ pathname: '/report', params: { type, id, ...(title ? { title } : {}) } })
      : router.navigate('/account');

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Signaler"
        hitSlop={6}
        onPress={open}
        style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
        <Icon name="flag-outline" size={17} themeColor="textSecondary" />
      </Pressable>
    );
  }
  return <Button label="Signaler" icon="flag-outline" variant="ghost" onPress={open} />;
}

const styles = StyleSheet.create({
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
