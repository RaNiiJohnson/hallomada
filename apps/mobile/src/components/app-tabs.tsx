import { api } from '@convex/_generated/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from 'convex/react';
import { NativeTabs } from 'expo-router/native-tabs';
import type { ComponentProps } from 'react';
import type { SFSymbol } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; label: string; sf: [SFSymbol, SFSymbol]; icon: IoniconName }[] = [
  { name: 'index', label: 'Jobs', sf: ['briefcase', 'briefcase.fill'], icon: 'briefcase' },
  { name: 'listings', label: 'Annonces', sf: ['house', 'house.fill'], icon: 'home' },
  { name: 'communities', label: 'Communautés', sf: ['person.3', 'person.3.fill'], icon: 'people' },
  {
    name: 'providers',
    label: 'Prestataires',
    sf: ['wrench.and.screwdriver', 'wrench.and.screwdriver.fill'],
    icon: 'construct',
  },
  { name: 'account', label: 'Compte', sf: ['person.crop.circle', 'person.crop.circle.fill'], icon: 'person-circle' },
];

export default function AppTabs() {
  const theme = useTheme();
  const unread = useQuery(api.notifications.queries.getUnreadCount);

  return (
    <NativeTabs
      backgroundColor={theme.card}
      tintColor={theme.primaryStrong}
      indicatorColor={theme.primarySoft}
      iconColor={{ default: theme.textSecondary, selected: theme.primaryText }}
      badgeBackgroundColor={theme.destructive}
      labelStyle={{
        default: { color: theme.textSecondary },
        selected: { color: theme.primaryText, fontWeight: '700' },
      }}>
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: tab.sf[0], selected: tab.sf[1] }}
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name={tab.icon} />}
          />
          {tab.name === 'account' && unread ? (
            <NativeTabs.Trigger.Badge>{unread >= 100 ? '99+' : String(unread)}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
