import { loadConfig, saveConfig } from '@/services/storage';
import { pushSyncData } from '@/services/sync-client';
import { isOnline } from '@/services/sync-engine';
import { AppConfig, CallLogEntry, SmsEntry, SyncPayload } from '@/types/sync';
import { Platform } from 'react-native';

let callLogListener: (() => void) | null = null;
let smsListener: (() => void) | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let lastCallTimestamp = 0;
let lastSmsTimestamp = 0;
let isMonitoring = false;

function mapCallType(type: string): CallLogEntry['type'] {
  switch (type) {
    case 'INCOMING':
      return 'incoming';
    case 'OUTGOING':
      return 'outgoing';
    case 'MISSED':
      return 'missed';
    default:
      return 'unknown';
  }
}

function mapSmsType(type: number): SmsEntry['type'] {
  switch (type) {
    case 1:
      return 'inbox';
    case 2:
      return 'sent';
    case 3:
      return 'draft';
    default:
      return 'unknown';
  }
}

interface CallLog {
  phoneNumber: string;
  name: string;
  type: string;
  duration: number;
  timestamp: number;
}

interface CallLogModule {
  load: (limit: number) => Promise<CallLog[]>;
}

async function getCallLogModule(): Promise<CallLogModule | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const module = await import('react-native-call-log');
    return module.default as CallLogModule;
  } catch {
    return null;
  }
}

interface SmsAndroidModule {
  list: (options: string, fail: (error: string) => void, success: (count: number, messagesJson: string) => void) => void;
  addListener?: (event: string, callback: (message: string) => void) => () => void;
}

async function getSmsAndroidModule(): Promise<SmsAndroidModule | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const module = await import('react-native-get-sms-android');
    return module as unknown as SmsAndroidModule;
  } catch {
    return null;
  }
}

async function syncNewCalls(config: AppConfig, since: number): Promise<number> {
  if (Platform.OS !== 'android') return 0;

  try {
    const CallLogs = await getCallLogModule();
    if (!CallLogs) return 0;
    const logs = await CallLogs.load(50);
    const newCalls = logs
      .map((log: CallLog) => ({
        id: log.phoneNumber + '-' + log.timestamp,
        phoneNumber: log.phoneNumber,
        name: log.name ?? 'Unknown',
        type: mapCallType(log.type),
        durationSeconds: log.duration,
        timestamp: log.timestamp,
      }))
      .filter((call: CallLogEntry) => call.timestamp > since);

    if (newCalls.length > 0) {
      const payload: SyncPayload = {
        deviceId: config.deviceId,
        sentAt: Date.now(),
        calls: newCalls,
        messages: [],
        driveFolderId: config.googleDriveFolderId.trim() || undefined,
      };
      await pushSyncData(config.syncUrl, payload);
      lastCallTimestamp = Math.max(...newCalls.map((c: CallLogEntry) => c.timestamp));
      return newCalls.length;
    }
  } catch (error) {
    console.warn('Real-time call sync failed:', error);
  }
  return 0;
}

async function syncNewSms(config: AppConfig, since: number): Promise<number> {
  if (Platform.OS !== 'android') return 0;

  try {
    const SmsAndroid = await getSmsAndroidModule();
    if (!SmsAndroid) return 0;
    const messages = await new Promise<SmsEntry[]>((resolve) => {
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          maxCount: 50,
          sortOrder: 'date DESC',
          minDate: since,
        }),
        (fail: string) => {
          console.warn('SMS fetch failed:', fail);
          resolve([]);
        },
        (_count: number, messagesJson: string) => {
          try {
            const messages = JSON.parse(messagesJson ?? '[]');
            if (!Array.isArray(messages)) {
              resolve([]);
              return;
            }
            resolve(
              messages
                .map((msg: Record<string, unknown>) => ({
                  id: String(msg._id ?? msg.date),
                  address: String(msg.address ?? ''),
                  body: String(msg.body ?? ''),
                  type: mapSmsType(Number(msg.type ?? 1)),
                  timestamp: Number(msg.date ?? 0),
                }))
                .filter((msg: SmsEntry) => msg.timestamp > since),
            );
          } catch (error) {
            console.warn('SMS parse failed:', error);
            resolve([]);
          }
        },
      );
    });

    if (messages.length > 0) {
      const payload: SyncPayload = {
        deviceId: config.deviceId,
        sentAt: Date.now(),
        calls: [],
        messages,
        driveFolderId: config.googleDriveFolderId.trim() || undefined,
      };
      await pushSyncData(config.syncUrl, payload);
      lastSmsTimestamp = Math.max(...messages.map(m => m.timestamp));
      return messages.length;
    }
  } catch (error) {
    console.warn('Real-time SMS sync failed:', error);
  }
  return 0;
}

async function pollForNewRecords(config: AppConfig): Promise<void> {
  if (!(await isOnline())) return;
  if (!config.syncUrl || !config.deviceId) return;
  if (!config.autoSync || !config.onboarded) return;

  try {
    const [callCount, smsCount] = await Promise.all([
      syncNewCalls(config, lastCallTimestamp),
      syncNewSms(config, lastSmsTimestamp),
    ]);

    if (callCount > 0 || smsCount > 0) {
      await saveConfig({ ...config, lastSyncAt: Date.now() });
      console.log(`Real-time sync: ${callCount} calls, ${smsCount} messages uploaded`);
    }
  } catch (error) {
    console.warn('Real-time poll failed:', error);
  }
}

export async function startRealTimeSync(config: AppConfig): Promise<void> {
  if (isMonitoring) return;
  
  if (Platform.OS !== 'android') {
    console.log('Real-time sync only supported on Android');
    return;
  }

  if (!config.autoSync || !config.onboarded || !config.syncUrl || !config.deviceId) {
    console.log('Real-time sync not started: missing config');
    return;
  }

  // Initialize timestamps from last sync
  lastCallTimestamp = config.lastSyncAt ?? 0;
  lastSmsTimestamp = config.lastSyncAt ?? 0;

  isMonitoring = true;
  console.log('Starting real-time sync monitoring...');

  // Poll every 30 seconds for new records
  pollingInterval = setInterval(async () => {
    try {
      const currentConfig = await loadConfig();
      await pollForNewRecords(currentConfig);
    } catch (error) {
      console.warn('Real-time poll interval failed:', error);
    }
  }, 30 * 1000);

  // Also listen for SMS events if available
  try {
    const SmsAndroid = await getSmsAndroidModule();
    if (SmsAndroid?.addListener) {
      smsListener = SmsAndroid.addListener('onSmsReceived', async (message: string) => {
        console.log('SMS received event:', message);
        const currentConfig = await loadConfig();
        await pollForNewRecords(currentConfig);
      });
    }
  } catch (error) {
    console.warn('SMS listener not available:', error);
  }

  // Initial poll
  await pollForNewRecords(config);
}

export async function stopRealTimeSync(): Promise<void> {
  if (!isMonitoring) return;

  isMonitoring = false;
  console.log('Stopping real-time sync monitoring...');

  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  if (smsListener) {
    smsListener();
    smsListener = null;
  }

  if (callLogListener) {
    callLogListener();
    callLogListener = null;
  }
}

export function isRealTimeSyncActive(): boolean {
  return isMonitoring;
}