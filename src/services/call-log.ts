import { Platform } from 'react-native';

import { CallLogEntry } from '@/types/sync';

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

export async function fetchCallLogs(limit = 50): Promise<CallLogEntry[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const CallLogs = require('react-native-call-log').default;
    const logs = await CallLogs.load(limit);
    return logs.map((log: Record<string, string | number>) => ({
      id: String(log.phoneNumber) + '-' + String(log.timestamp),
      phoneNumber: String(log.phoneNumber ?? ''),
      name: String(log.name ?? 'Unknown'),
      type: mapCallType(String(log.type ?? '')),
      durationSeconds: Number(log.duration ?? 0),
      timestamp: Number(log.timestamp ?? 0),
    }));
  } catch {
    return [];
  }
}
