import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loadConfig, saveConfig } from '@/services/storage';
import { AppConfig, DEFAULT_APP_CONFIG } from '@/types/sync';

type AppConfigContextValue = {
  config: AppConfig;
  loading: boolean;
  updateConfig: (patch: Partial<AppConfig>) => Promise<void>;
  completeOnboarding: (patch: Partial<AppConfig>) => Promise<void>;
};

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

async function ensureDeviceId(config: AppConfig): Promise<AppConfig> {
  if (config.deviceId) return config;
  const deviceId = Crypto.randomUUID();
  return { ...config, deviceId };
}

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await loadConfig();
      const withId = await ensureDeviceId(stored);
      setConfig(withId);
      if (withId.deviceId !== stored.deviceId) {
        await saveConfig(withId);
      }
      setLoading(false);
    })();
  }, []);

  const updateConfig = useCallback(async (patch: Partial<AppConfig>) => {
    setConfig((current) => {
      const next = { ...current, ...patch };
      void saveConfig(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(async (patch: Partial<AppConfig>) => {
    const next = { ...config, ...patch, onboarded: true, consentGiven: true };
    await saveConfig(next);
    setConfig(next);
  }, [config]);

  const value = useMemo(
    () => ({ config, loading, updateConfig, completeOnboarding }),
    [config, loading, updateConfig, completeOnboarding],
  );

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return context;
}
