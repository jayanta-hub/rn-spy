import { Platform } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { StatusCard } from '@/components/status-card';
import { ThemedText } from '@/components/themed-text';
import { useAppConfig } from '@/context/app-config-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useSyncStatus } from '@/hooks/use-sync-status';

function formatTime(timestamp: number | null) {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString();
}

function statusTone(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'success':
      return 'success';
    case 'offline':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

export default function DashboardScreen() {
  const { config } = useAppConfig();
  const { permissions } = usePermissions();
  const { status, online, received, syncNow } = useSyncStatus();

  const callCount =
    config.role === 'receiver' ? (received?.calls.length ?? 0) : permissions.callLog ? 'Ready' : 'No access';
  const messageCount =
    config.role === 'receiver'
      ? (received?.messages.length ?? 0)
      : permissions.sms
        ? 'Ready'
        : 'No access';

  return (
    <ScreenContainer>
      <ThemedText type="title">Dashboard</ThemedText>
      <ThemedText themeColor="textSecondary">
        {config.role === 'sender'
          ? 'Your data syncs to the configured server when this phone is online.'
          : 'Synced data from your configured sender device appears here.'}
      </ThemedText>

      <StatusCard title="Device role" value={config.role === 'sender' ? 'Sender' : 'Receiver'} />
      <StatusCard
        title="Network"
        value={online ? 'Online' : 'Offline'}
        tone={online ? 'success' : 'warning'}
      />
      <StatusCard
        title="Sync status"
        value={status}
        hint={`Last sync: ${formatTime(config.lastSyncAt)}`}
        tone={statusTone(status)}
      />
      <StatusCard title="Calls" value={String(callCount)} />
      <StatusCard title="Messages" value={String(messageCount)} />

      {Platform.OS !== 'android' ? (
        <ThemedText themeColor="textSecondary">
          Install on Android with a development build for full call and SMS access.
        </ThemedText>
      ) : null}

      <PrimaryButton label="Sync now" onPress={syncNow} disabled={status === 'syncing'} />
    </ScreenContainer>
  );
}
