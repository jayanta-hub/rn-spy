import { Platform } from 'react-native';

import { SmsEntry } from '@/types/sync';

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

export async function fetchSmsMessages(limit = 50, since?: number): Promise<SmsEntry[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const SmsAndroid = await getSmsAndroidModule();
    if (!SmsAndroid) return [];
    return await new Promise<SmsEntry[]>((resolve) => {
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          maxCount: limit,
          sortOrder: 'date DESC',
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
                .filter((msg: SmsEntry) => !since || msg.timestamp > since),
            );
          } catch (error) {
            console.warn('SMS parse failed:', error);
            resolve([]);
          }
        },
      );
    });
  } catch {
    return [];
  }
}
