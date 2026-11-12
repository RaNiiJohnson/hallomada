import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, type PressableProps, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const tabs: { name: string; href: '/' | '/listings' | '/communities' | '/providers' | '/account'; label: string; icon: IconName }[] = [
  { name: 'home', href: '/', label: 'Jobs', icon: 'briefcase' },
  { name: 'listings', href: '/listings', label: 'Annonces', icon: 'home' },
  { name: 'communities', href: '/communities', label: 'Communautés', icon: 'people' },
  { name: 'providers', href: '/providers', label: 'Prestataires', icon: 'construct' },
  { name: 'account', href: '/account', label: 'Compte', icon: 'person-circle' },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
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
  return (
    // TabTrigger's slot ref type does not match Pressable's; the runtime props do.
    <Pressable {...(props as PressableProps)} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButton, isFocused && { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} size={18} color={isFocused ? theme.primaryText : theme.textSecondary} />
        <ThemedText
          type="small"
          style={{ color: isFocused ? theme.primaryText : theme.textSecondary, fontWeight: isFocused ? 700 : 500 }}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText type="heading" style={[styles.brandText, { color: theme.primaryText }]}>
          Hallomada
        </ThemedText>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
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
});
