import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { useAppConfig } from '@/context/app-config-context';
import { startRealTimeSync, stopRealTimeSync } from '@/services/realtime-sync';
import { saveConfig } from '@/services/storage';
import { runReceiverSync, runSenderSync } from '@/services/sync-engine';
import { AppConfig } from '@/types/sync';

const BACKGROUND_SYNC_TASK = 'background-sync';

export async function registerBackgroundSync(): Promise<void> {
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundSync(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
}

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    // We need to load config from storage directly since we can't use hooks in background tasks
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem('@rnspy/config');
    if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;
    
    const config: AppConfig = JSON.parse(raw);
    
    if (!config.autoSync || !config.onboarded) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let result;
    if (config.role === 'sender') {
      result = await runSenderSync(config);
    } else {
      const payload = await runReceiverSync(config);
      result = payload ? 'success' : 'error';
    }

    if (result === 'success') {
      await saveConfig({ ...config, lastSyncAt: Date.now() });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export function useBackgroundSync() {
  const { config } = useAppConfig();

  const startBackgroundSync = async () => {
    if (config.autoSync && config.onboarded) {
      await registerBackgroundSync();
      await startRealTimeSync(config);
    } else {
      await unregisterBackgroundSync();
      await stopRealTimeSync();
    }
  };

  const stopBackgroundSync = async () => {
    await unregisterBackgroundSync();
    await stopRealTimeSync();
  };

  return { startBackgroundSync, stopBackgroundSync };
}