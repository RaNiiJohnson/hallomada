import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeTabs } from 'expo-router/native-tabs';
import type { ComponentProps } from 'react';
import type { SFSymbol } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Same order, names and icons as the web navbar (apps/web/src/components/main-navbar.tsx).
// The account lives in the avatar at the top right of every tab.
const tabs: { name: string; label: string; sf: [SFSymbol, SFSymbol]; icon: IoniconName }[] = [
  { name: 'index', label: 'Accueil', sf: ['house', 'house.fill'], icon: 'home' },
  { name: 'communities', label: 'Communautés', sf: ['person.3', 'person.3.fill'], icon: 'people' },
  { name: 'jobs', label: 'Emplois', sf: ['briefcase', 'briefcase.fill'], icon: 'briefcase' },
  { name: 'listings', label: 'Immobilier', sf: ['building.2', 'building.2.fill'], icon: 'business' },
  { name: 'providers', label: 'Prestataires', sf: ['storefront', 'storefront.fill'], icon: 'storefront' },
];

export default function AppTabs() {
  const theme = useTheme();
  return (
    <NativeTabs
      // Android hides unselected labels with five tabs; keep every label visible.
      labelVisibilityMode="labeled"
      backgroundColor={theme.card}
      tintColor={theme.primaryStrong}
      indicatorColor={theme.primarySoft}
      iconColor={{ default: theme.textSecondary, selected: theme.primaryText }}
      labelStyle={{
        default: { color: theme.textSecondary, fontSize: 11 },
        selected: { color: theme.primaryText, fontSize: 11, fontWeight: '700' },
      }}>
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: tab.sf[0], selected: tab.sf[1] }}
            src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name={tab.icon} />}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
