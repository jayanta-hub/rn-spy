import * as Network from 'expo-network';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAppConfig } from '@/context/app-config-context';
import { startRealTimeSync, stopRealTimeSync } from '@/services/realtime-sync';
import { loadReceivedData } from '@/services/storage';
import { isOnline, runReceiverSync, runSenderSync } from '@/services/sync-engine';
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
    let mounted = true;
    const checkOnline = async () => {
      const isConnected = await isOnline();
      if (mounted) {
        setOnline(isConnected);
        if (config.role === 'receiver') {
          const received = await loadReceivedData();
          if (mounted) setReceived(received);
        }
      }
    };
    checkOnline();
    return () => { mounted = false; };
  }, [config.role]);

  useEffect(() => {
    if (!config.autoSync || !config.onboarded) return;

    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        await startRealTimeSync(config);
        await syncNow();
      } else if (state === 'background' || state === 'inactive') {
        await stopRealTimeSync();
      }
    });

    // Initial sync
    const doInitialSync = async () => {
      await syncNow();
    };
    doInitialSync();
    return () => subscription.remove();
  }, [config.autoSync, config.onboarded, syncNow, config]);

  useEffect(() => {
    if (!config.autoSync || !config.onboarded) return;

    const subscription = Network.addNetworkStateListener(async (networkState) => {
      const connected = Boolean(
        networkState.isConnected && networkState.isInternetReachable !== false,
      );
      setOnline(connected);

      if (connected) {
        await startRealTimeSync(config);
        await syncNow();
      } else {
        await stopRealTimeSync();
      }
    });

    return () => subscription.remove();
  }, [config.autoSync, config.onboarded, syncNow, config]);

  return { status, online, received, syncNow };
}
