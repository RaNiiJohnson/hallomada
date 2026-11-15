import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, type PressableProps, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';
import { useTheme } from '@/hooks/use-theme';

const tabs: {
  name: string;
  href: '/' | '/communities' | '/jobs' | '/listings' | '/providers';
  label: string;
  icon: IconName;
}[] = [
  { name: 'index', href: '/', label: 'Accueil', icon: 'home' },
  { name: 'communities', href: '/communities', label: 'Communautés', icon: 'people' },
  { name: 'jobs', href: '/jobs', label: 'Emplois', icon: 'briefcase' },
  { name: 'listings', href: '/listings', label: 'Immobilier', icon: 'business' },
  { name: 'providers', href: '/providers', label: 'Prestataires', icon: 'storefront' },
];

// Below this width the bar becomes a classic bottom tab bar (icon over label,
// equal columns) so the five tabs always fit on a phone screen.
const COMPACT_MAX_WIDTH = 720;

// The server does not know the window width, so render the compact bar until
// hydration is done; this keeps server and client HTML identical.
function useCompact() {
  const hydrated = useHydrated();
  const { width } = useWindowDimensions();
  return !hydrated || width < COMPACT_MAX_WIDTH;
}

export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: IconName }) {
  const theme = useTheme();
  const compact = useCompact();

  if (compact) {
    const color = isFocused ? theme.primary : theme.textSecondary;
    return (
      // TabTrigger's slot ref type does not match Pressable's; the runtime props do.
      <Pressable
        {...(props as PressableProps)}
        style={({ pressed }) => [styles.compactButton, pressed && styles.pressed]}>
        <Icon name={isFocused ? icon : (`${icon}-outline` as IconName)} size={22} color={color} />
        <ThemedText numberOfLines={1} style={[styles.compactLabel, { color, fontWeight: isFocused ? 600 : 500 }]}>
          {children}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable {...(props as PressableProps)} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButton, isFocused && { backgroundColor: theme.primary }]}>
        <Icon name={icon} size={18} color={isFocused ? theme.primaryForeground : theme.textSecondary} />
        <ThemedText
          type="small"
          style={{ color: isFocused ? theme.primaryForeground : theme.textSecondary, fontWeight: isFocused ? 600 : 500 }}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  const compact = useCompact();

  if (compact) {
    return (
      <View
        {...props}
        style={[styles.compactBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {props.children}
      </View>
    );
  }

  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText type="heading" style={[styles.brandText, { color: theme.text }]}>
          Hallomada
        </ThemedText>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
  tabListContainer: {
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
  },
  brandText: { marginRight: 'auto' },
  pressed: { opacity: 0.7 },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
  },
  compactBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one + 2,
    paddingBottom: Spacing.two,
  },
  compactButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
  },
  compactLabel: { fontSize: 11, lineHeight: 14 },
});
