import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedView } from '@/components/themed-view';
import { AppConfigProvider, useAppConfig } from '@/context/app-config-context';
import { useBackgroundSync } from '@/services/background-sync';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { loading, config } = useAppConfig();
  const { startBackgroundSync, stopBackgroundSync } = useBackgroundSync();

  // Register/unregister background sync based on config
  useEffect(() => {
    if (!loading) {
      if (config.autoSync && config.onboarded) {
        startBackgroundSync();
      } else {
        stopBackgroundSync();
      }
    }
  }, [config.autoSync, config.onboarded, loading, startBackgroundSync, stopBackgroundSync]);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppConfigProvider>
      <RootNavigator />
    </AppConfigProvider>
  );
}
