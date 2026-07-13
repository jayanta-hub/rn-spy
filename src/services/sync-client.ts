import { SyncPayload } from '@/types/sync';

export async function pushSyncData(syncUrl: string, payload: SyncPayload): Promise<void> {
  const base = syncUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Sync failed with status ${response.status}`);
  }
}

export async function pullSyncData(syncUrl: string, deviceId: string): Promise<SyncPayload | null> {
  const base = syncUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/api/sync/${encodeURIComponent(deviceId)}`);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Pull failed with status ${response.status}`);
  }

  return response.json();
}

export async function checkServerHealth(syncUrl: string): Promise<boolean> {
  try {
    const base = syncUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
