import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppConfig, DEFAULT_APP_CONFIG, SyncPayload } from '@/types/sync';

const KEYS = {
  config: '@rnspy/config',
  queue: '@rnspy/sync-queue',
  received: '@rnspy/received-data',
} as const;

export async function loadConfig(): Promise<AppConfig> {
  const raw = await AsyncStorage.getItem(KEYS.config);
  if (!raw) return { ...DEFAULT_APP_CONFIG };
  return { ...DEFAULT_APP_CONFIG, ...JSON.parse(raw) };
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await AsyncStorage.setItem(KEYS.config, JSON.stringify(config));
}

export async function loadQueue(): Promise<SyncPayload[]> {
  const raw = await AsyncStorage.getItem(KEYS.queue);
  return raw ? JSON.parse(raw) : [];
}

export async function saveQueue(queue: SyncPayload[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.queue, JSON.stringify(queue));
}

export async function loadReceivedData(): Promise<SyncPayload | null> {
  const raw = await AsyncStorage.getItem(KEYS.received);
  return raw ? JSON.parse(raw) : null;
}

export async function saveReceivedData(payload: SyncPayload): Promise<void> {
  await AsyncStorage.setItem(KEYS.received, JSON.stringify(payload));
}
