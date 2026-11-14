import { api } from '@convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 40;

/** Header shortcut to the account screen: the user's avatar, or a sign-in icon when logged out. */
export function AccountButton() {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.auth.getCurrentUser, isAuthenticated ? {} : 'skip');
  const unread = useQuery(api.notifications.queries.getUnreadCount, isAuthenticated ? {} : 'skip');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isAuthenticated ? 'Mon compte' : 'Se connecter'}
      hitSlop={6}
      onPress={() => router.push('/account')}
      style={({ pressed }) => pressed && styles.pressed}>
      {isAuthenticated ? (
        <View style={[styles.ring, { borderColor: theme.primary }]}>
          <Avatar uri={user?.image} name={user?.name} size={SIZE - 4} />
        </View>
      ) : (
        <View style={[styles.ring, styles.guest, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Icon name="person-outline" size={20} themeColor="text" />
        </View>
      )}
      {unread ? (
        <View style={[styles.badge, { backgroundColor: theme.destructive, borderColor: theme.background }]}>
          <ThemedText style={styles.badgeText}>{unread > 9 ? '9+' : unread}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Bell that opens the notifications list, with the unread count. Hidden when logged out. */
export function NotificationsButton() {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const unread = useQuery(api.notifications.queries.getUnreadCount, isAuthenticated ? {} : 'skip');
  if (!isAuthenticated) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notifications, ${unread} non lue(s)` : 'Notifications'}
      hitSlop={6}
      onPress={() => router.push('/me/notifications')}
      style={({ pressed }) => [
        styles.ring,
        styles.guest,
        { borderColor: theme.border, backgroundColor: theme.card },
        pressed && styles.pressed,
      ]}>
      <Icon name={unread ? 'notifications' : 'notifications-outline'} size={20} themeColor="text" />
      {unread ? <View style={[styles.dot, { backgroundColor: theme.destructive, borderColor: theme.card }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guest: { borderWidth: 1 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, lineHeight: 12, fontWeight: 800 },
  dot: { position: 'absolute', top: 8, right: 9, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
