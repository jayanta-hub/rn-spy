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

export async function fetchCallLogs(limit = 50, since?: number): Promise<CallLogEntry[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const CallLogs = await getCallLogModule();
    if (!CallLogs) return [];
    const logs = await CallLogs.load(limit);
    return logs
      .map((log: CallLog) => ({
        id: log.phoneNumber + '-' + log.timestamp,
        phoneNumber: log.phoneNumber,
        name: log.name ?? 'Unknown',
        type: mapCallType(log.type),
        durationSeconds: log.duration,
        timestamp: log.timestamp,
      }))
      .filter((call: CallLogEntry) => !since || call.timestamp > since);
  } catch {
    return [];
  }
}
