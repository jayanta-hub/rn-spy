import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppConfig } from '@/context/app-config-context';
import { fetchCallLogs } from '@/services/call-log';
import { loadReceivedData } from '@/services/storage';
import { CallLogEntry } from '@/types/sync';

export default function CallsScreen() {
  const { config } = useAppConfig();
  const [calls, setCalls] = useState<CallLogEntry[]>([]);

  const load = useCallback(async () => {
    if (config.role === 'receiver') {
      const received = await loadReceivedData();
      setCalls(received?.calls ?? []);
      return;
    }
    setCalls(await fetchCallLogs(100));
  }, [config.role]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenContainer>
      <ThemedText type="subtitle">Call History</ThemedText>
      <ThemedText themeColor="textSecondary">
        {config.role === 'receiver'
          ? 'Calls synced from your sender device.'
          : 'Recent calls from this device.'}
      </ThemedText>

      {Platform.OS !== 'android' && config.role === 'sender' ? (
        <ThemedText themeColor="textSecondary">Call log is only available on Android.</ThemedText>
      ) : null}

      <PrimaryButton label="Refresh" onPress={load} />

      {calls.length === 0 ? (
        <ThemedText themeColor="textSecondary">No calls found.</ThemedText>
      ) : (
        calls.map((call) => (
          <ThemedView key={call.id} type="backgroundElement" style={styles.row}>
            <ThemedText type="smallBold">{call.name || call.phoneNumber}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {call.type} · {call.durationSeconds}s · {new Date(call.timestamp).toLocaleString()}
            </ThemedText>
          </ThemedView>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
});
