export type DeviceRole = 'sender' | 'receiver';

export type CallLogEntry = {
  id: string;
  phoneNumber: string;
  name: string;
  type: 'incoming' | 'outgoing' | 'missed' | 'unknown';
  durationSeconds: number;
  timestamp: number;
};

export type SmsEntry = {
  id: string;
  address: string;
  body: string;
  type: 'inbox' | 'sent' | 'draft' | 'unknown';
  timestamp: number;
};

export type SyncPayload = {
  deviceId: string;
  sentAt: number;
  calls: CallLogEntry[];
  messages: SmsEntry[];
};

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export type AppConfig = {
  onboarded: boolean;
  consentGiven: boolean;
  role: DeviceRole;
  deviceId: string;
  deviceName: string;
  syncUrl: string;
  targetDeviceId: string;
  autoSync: boolean;
  lastSyncAt: number | null;
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  onboarded: false,
  consentGiven: false,
  role: 'sender',
  deviceId: '',
  deviceName: 'My Android',
  syncUrl: 'http://192.168.1.100:3000',
  targetDeviceId: '',
  autoSync: true,
  lastSyncAt: null,
};
