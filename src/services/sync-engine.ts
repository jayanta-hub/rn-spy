import * as Network from 'expo-network';

import { fetchCallLogs } from '@/services/call-log';
import { fetchSmsMessages } from '@/services/sms';
import { loadQueue, loadReceivedData, saveQueue, saveReceivedData } from '@/services/storage';
import { checkServerHealth, pullSyncData, pushSyncData } from '@/services/sync-client';
import { AppConfig, SyncPayload, SyncStatus } from '@/types/sync';

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function collectPayload(config: AppConfig): Promise<SyncPayload> {
  const [calls, messages] = await Promise.all([fetchCallLogs(100), fetchSmsMessages(100)]);
  return {
    deviceId: config.deviceId,
    sentAt: Date.now(),
    calls,
    messages,
    driveFolderId: config.googleDriveFolderId.trim() || undefined,
  };
}

export async function enqueuePayload(payload: SyncPayload): Promise<void> {
  const queue = await loadQueue();
  queue.push(payload);
  await saveQueue(queue);
}

export async function flushQueue(syncUrl: string): Promise<number> {
  const queue = await loadQueue();
  if (queue.length === 0) return 0;

  const remaining: SyncPayload[] = [];
  let sent = 0;

  for (const payload of queue) {
    try {
      await pushSyncData(syncUrl, payload);
      sent += 1;
    } catch {
      remaining.push(payload);
    }
  }

  await saveQueue(remaining);
  return sent;
}

export async function runSenderSync(config: AppConfig): Promise<SyncStatus> {
  if (!(await isOnline())) return 'offline';
  if (!config.syncUrl || !config.deviceId) return 'error';

  const healthy = await checkServerHealth(config.syncUrl);
  if (!healthy) return 'offline';

  try {
    const payload = await collectPayload(config);
    await pushSyncData(config.syncUrl, payload);
    await flushQueue(config.syncUrl);
    return 'success';
  } catch {
    const payload = await collectPayload(config);
    await enqueuePayload(payload);
    return 'error';
  }
}

export async function runReceiverSync(config: AppConfig): Promise<SyncPayload | null> {
  if (!(await isOnline())) return null;
  if (!config.syncUrl || !config.targetDeviceId) return null;

  const payload = await pullSyncData(config.syncUrl, config.targetDeviceId);
  if (payload) {
    await saveReceivedData(payload);
  }
  return payload ?? (await loadReceivedData());
}
