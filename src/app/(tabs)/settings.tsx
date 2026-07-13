import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppConfig } from '@/context/app-config-context';
import { usePermissions } from '@/hooks/use-permissions';
import { checkServerHealth } from '@/services/sync-client';
import { DeviceRole } from '@/types/sync';

export default function SettingsScreen() {
  const { config, updateConfig } = useAppConfig();
  const { permissions, requestAll } = usePermissions();
  const [syncUrl, setSyncUrl] = useState(config.syncUrl);
  const [deviceName, setDeviceName] = useState(config.deviceName);
  const [targetDeviceId, setTargetDeviceId] = useState(config.targetDeviceId);
  const [serverStatus, setServerStatus] = useState<string>('unknown');

  const save = async () => {
    await updateConfig({
      syncUrl,
      deviceName,
      targetDeviceId,
    });
    const healthy = await checkServerHealth(syncUrl);
    setServerStatus(healthy ? 'reachable' : 'unreachable');
  };

  const setRole = async (role: DeviceRole) => {
    await updateConfig({ role });
  };

  return (
    <ScreenContainer>
      <ThemedText type="subtitle">Settings</ThemedText>

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="smallBold">Device</ThemedText>
        <LabeledInput label="Device name" value={deviceName} onChangeText={setDeviceName} />
        <ThemedText type="small" themeColor="textSecondary">
          Device ID: {config.deviceId}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="smallBold">Role</ThemedText>
        <RoleToggle role={config.role} onChange={setRole} />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="smallBold">Sync server</ThemedText>
        <LabeledInput
          label="Server URL"
          value={syncUrl}
          onChangeText={setSyncUrl}
          placeholder="http://192.168.1.100:3000"
        />
        {config.role === 'receiver' ? (
          <LabeledInput
            label="Sender device ID"
            value={targetDeviceId}
            onChangeText={setTargetDeviceId}
            placeholder="Paste sender device ID"
          />
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          Server status: {serverStatus}
        </ThemedText>
        {config.role === 'sender' ? (
          <ThemedText type="small" themeColor="textSecondary">
            The sync server securely forwards call logs and SMS to its configured Google Drive folder.
          </ThemedText>
        ) : null}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="smallBold">Permissions</ThemedText>
        <ThemedText type="small">Call log: {permissions.callLog ? 'granted' : 'denied'}</ThemedText>
        <ThemedText type="small">SMS: {permissions.sms ? 'granted' : 'denied'}</ThemedText>
        <PrimaryButton label="Request permissions" onPress={requestAll} />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.rowBetween}>
        <ThemedText type="smallBold">Auto sync when online</ThemedText>
        <Switch value={config.autoSync} onValueChange={(autoSync) => updateConfig({ autoSync })} />
      </ThemedView>

      <PrimaryButton label="Save settings" onPress={save} />
    </ScreenContainer>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <ThemedView style={styles.inputGroup}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        style={styles.input}
      />
    </ThemedView>
  );
}

function RoleToggle({ role, onChange }: { role: DeviceRole; onChange: (role: DeviceRole) => void }) {
  return (
    <ThemedView style={styles.roleRow}>
      {(['sender', 'receiver'] as DeviceRole[]).map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={[styles.roleChip, role === option && styles.roleChipActive]}>
          <ThemedText style={role === option ? styles.roleChipTextActive : undefined}>
            {option}
          </ThemedText>
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    fontSize: 16,
  },
  rowBetween: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  roleChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    backgroundColor: '#EEF2F6',
  },
  roleChipActive: {
    backgroundColor: '#208AEF',
  },
  roleChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
