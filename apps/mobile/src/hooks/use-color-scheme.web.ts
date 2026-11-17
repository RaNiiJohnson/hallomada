import { useColorScheme as useRNColorScheme } from 'react-native';

import { useHydrated } from './use-hydrated';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web:
 * the server snapshot is "not hydrated", the client snapshot is "hydrated".
 */
export function useColorScheme() {
  const hasHydrated = useHydrated();
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
