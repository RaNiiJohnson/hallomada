import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { backend } from '@/lib/backend';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {backend ? (
        <ConvexBetterAuthProvider client={backend.convex} authClient={backend.authClient}>
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="jobs/[slug]/index" options={{ title: 'Offre' }} />
            <Stack.Screen
              name="jobs/[slug]/apply"
              options={{ title: 'Candidature', presentation: 'modal' }}
            />
            <Stack.Screen name="listings/[slug]/index" options={{ title: 'Annonce' }} />
            <Stack.Screen
              name="listings/[slug]/dossier"
              options={{ title: 'Envoyer mon dossier', presentation: 'modal' }}
            />
          </Stack>
        </ConvexBetterAuthProvider>
      ) : (
        <MissingConfig />
      )}
    </ThemeProvider>
  );
}

function MissingConfig() {
  return (
    <ThemedView style={styles.missing}>
      <ThemedText type="subtitle">Configuration manquante</ThemedText>
      <ThemedText>
        Ajoute EXPO_PUBLIC_CONVEX_URL et EXPO_PUBLIC_SITE_URL dans apps/mobile/.env.local puis
        relance Expo.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
