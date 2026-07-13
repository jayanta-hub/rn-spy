import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppConfig } from '@/context/app-config-context';
import { usePermissions } from '@/hooks/use-permissions';
import { DeviceRole } from '@/types/sync';

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppConfig();
  const { requestAll } = usePermissions();
  const [role, setRole] = useState<DeviceRole>('sender');
  const [consent, setConsent] = useState(false);

  const finish = async () => {
    if (Platform.OS === 'android') {
      await requestAll();
    }
    await completeOnboarding({ role });
    router.replace('/(tabs)');
  };

  return (
    <ScreenContainer>
      <ThemedText type="title">Device Sync</ThemedText>
      <ThemedText themeColor="textSecondary">
        Back up your own call history and messages to a device you configure. You must own this phone
        and consent to data collection.
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Choose device role</ThemedText>
        <RoleOption
          title="Sender"
          description="Collects call log and SMS from this phone and uploads when online."
          selected={role === 'sender'}
          onPress={() => setRole('sender')}
        />
        <RoleOption
          title="Receiver"
          description="Pulls synced data from your configured sender device."
          selected={role === 'receiver'}
          onPress={() => setRole('receiver')}
        />
      </ThemedView>

      <Pressable onPress={() => setConsent((value) => !value)} style={styles.consentRow}>
        <View style={[styles.checkbox, consent && styles.checkboxChecked]} />
        <ThemedText style={styles.consentText}>
          I confirm this is my device, I consent to backing up my data, and I will only monitor
          devices I own or am authorized to manage.
        </ThemedText>
      </Pressable>

      {Platform.OS !== 'android' ? (
        <ThemedText themeColor="textSecondary">
          This app is Android-only. Features are limited on other platforms.
        </ThemedText>
      ) : null}

      <PrimaryButton label="Continue" onPress={finish} disabled={!consent} />
    </ScreenContainer>
  );
}

function RoleOption({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.roleOption, selected && styles.roleSelected]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  roleOption: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleSelected: {
    borderColor: '#208AEF',
    backgroundColor: '#208AEF22',
  },
  consentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#208AEF',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#208AEF',
  },
  consentText: {
    flex: 1,
  },
});
