import { Redirect } from 'expo-router';

import { useAppConfig } from '@/context/app-config-context';

export default function Index() {
  const { config, loading } = useAppConfig();

  if (loading) return null;
  if (!config.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
