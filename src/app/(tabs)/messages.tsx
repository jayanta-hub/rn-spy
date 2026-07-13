import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppConfig } from '@/context/app-config-context';
import { fetchSmsMessages } from '@/services/sms';
import { loadReceivedData } from '@/services/storage';
import { SmsEntry } from '@/types/sync';

export default function MessagesScreen() {
  const { config } = useAppConfig();
  const [messages, setMessages] = useState<SmsEntry[]>([]);

  const load = useCallback(async () => {
    if (config.role === 'receiver') {
      const received = await loadReceivedData();
      setMessages(received?.messages ?? []);
      return;
    }
    setMessages(await fetchSmsMessages(100));
  }, [config.role]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenContainer>
      <ThemedText type="subtitle">Messages</ThemedText>
      <ThemedText themeColor="textSecondary">
        {config.role === 'receiver'
          ? 'Messages synced from your sender device.'
          : 'Recent SMS from this device.'}
      </ThemedText>

      {Platform.OS !== 'android' && config.role === 'sender' ? (
        <ThemedText themeColor="textSecondary">SMS access is only available on Android.</ThemedText>
      ) : null}

      <PrimaryButton label="Refresh" onPress={load} />

      {messages.length === 0 ? (
        <ThemedText themeColor="textSecondary">No messages found.</ThemedText>
      ) : (
        messages.map((message) => (
          <ThemedView key={message.id} type="backgroundElement" style={styles.row}>
            <ThemedText type="smallBold">{message.address}</ThemedText>
            <ThemedText numberOfLines={3}>{message.body}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {message.type} · {new Date(message.timestamp).toLocaleString()}
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
