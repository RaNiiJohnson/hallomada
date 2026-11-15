import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { backend } from '@/lib/backend';

SplashScreen.preventAutoHideAsync();

// Navigation colors (screen background, headers) built from the Hallomada palette.
function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.card,
      text: c.text,
      border: c.border,
    },
  };
}

const navigationThemes = { light: navigationTheme('light'), dark: navigationTheme('dark') };

export default function RootLayout() {
  // The web hook returns "light" until hydration, so server and client HTML match.
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={navigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>
      <AnimatedSplashOverlay />
      {backend ? (
        <ConvexBetterAuthProvider client={backend.convex} authClient={backend.authClient}>
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="account" options={{ title: 'Mon compte' }} />
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
            <Stack.Screen name="me/notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="me/favorites" options={{ title: 'Favoris' }} />
            <Stack.Screen name="me/applications" options={{ title: 'Mes candidatures' }} />
            <Stack.Screen name="me/publications" options={{ title: 'Mes publications' }} />
            <Stack.Screen name="me/communities" options={{ title: 'Mes communautés' }} />
            <Stack.Screen name="me/providers" options={{ title: 'Mes pages prestataire' }} />
            <Stack.Screen name="communities/[community]" options={{ title: 'Communauté' }} />
            <Stack.Screen name="posts/[slug]" options={{ title: 'Publication' }} />
            <Stack.Screen name="providers/[slug]" options={{ title: 'Prestataire' }} />
            <Stack.Screen name="profiles/[slug]" options={{ title: 'Profil' }} />
            <Stack.Screen
              name="auth/register"
              options={{ title: 'Créer un compte', presentation: 'modal' }}
            />
            <Stack.Screen
              name="auth/forgot-password"
              options={{ title: 'Mot de passe oublié', presentation: 'modal' }}
            />
            <Stack.Screen
              name="posts/new"
              options={{ title: 'Nouvelle publication', presentation: 'modal' }}
            />
            <Stack.Screen
              name="jobs/new"
              options={{ title: 'Publier une offre', presentation: 'modal' }}
            />
            <Stack.Screen
              name="listings/new"
              options={{ title: 'Publier une annonce', presentation: 'modal' }}
            />
            <Stack.Screen name="report" options={{ title: 'Signaler', presentation: 'modal' }} />
            <Stack.Screen
              name="jobs/[slug]/edit"
              options={{ title: 'Modifier l’offre', presentation: 'modal' }}
            />
            <Stack.Screen
              name="listings/[slug]/edit"
              options={{ title: 'Modifier l’annonce', presentation: 'modal' }}
            />
            <Stack.Screen
              name="posts/edit/[slug]"
              options={{ title: 'Modifier la publication', presentation: 'modal' }}
            />
            <Stack.Screen
              name="communities/new"
              options={{ title: 'Nouvelle communauté', presentation: 'modal' }}
            />
            <Stack.Screen
              name="communities/edit/[community]"
              options={{ title: 'Modifier la communauté', presentation: 'modal' }}
            />
            <Stack.Screen
              name="providers/new"
              options={{ title: 'Créer ma page prestataire', presentation: 'modal' }}
            />
            <Stack.Screen
              name="providers/edit/[slug]"
              options={{ title: 'Modifier ma page', presentation: 'modal' }}
            />
            <Stack.Screen name="me/profile" options={{ title: 'Mon profil' }} />
            <Stack.Screen name="me/dossier" options={{ title: 'Dossier de location' }} />
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
