import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';

import { useAppConfig } from '@/context/app-config-context';
import { isOnline, runReceiverSync, runSenderSync } from '@/services/sync-engine';
import { loadReceivedData } from '@/services/storage';
import { SyncPayload, SyncStatus } from '@/types/sync';

export function useSyncStatus() {
  const { config, updateConfig } = useAppConfig();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [received, setReceived] = useState<SyncPayload | null>(null);
  const [online, setOnline] = useState(true);
  const isSyncingRef = useRef(false);

  const refreshOnline = useCallback(async () => {
    setOnline(await isOnline());
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setStatus('syncing');

    try {
      await refreshOnline();
      if (config.role === 'sender') {
        const result = await runSenderSync(config);
        setStatus(result);
        if (result === 'success') {
          await updateConfig({ lastSyncAt: Date.now() });
        }
      } else {
        const payload = await runReceiverSync(config);
        setReceived(payload);
        setStatus(payload ? 'success' : 'error');
        if (payload) {
          await updateConfig({ lastSyncAt: Date.now() });
        }
      }
    } catch {
      setStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [config, refreshOnline, updateConfig]);

  useEffect(() => {
    void refreshOnline();
    if (config.role === 'receiver') {
      void loadReceivedData().then(setReceived);
    }
  }, [config.role, refreshOnline]);

  useEffect(() => {
    if (!config.autoSync || !config.onboarded) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncNow();
      }
    });

    void syncNow();
    return () => subscription.remove();
  }, [config.autoSync, config.onboarded, syncNow]);

  useEffect(() => {
    if (!config.autoSync || !config.onboarded) return;

    const subscription = Network.addNetworkStateListener((networkState) => {
      const connected = Boolean(
        networkState.isConnected && networkState.isInternetReachable !== false,
      );
      setOnline(connected);

      if (connected) {
        void syncNow();
      }
    });

    return () => subscription.remove();
  }, [config.autoSync, config.onboarded, syncNow]);

  return { status, online, received, syncNow };
}
