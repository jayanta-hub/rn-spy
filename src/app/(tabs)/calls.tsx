import { useCallback, useEffect, useState } from 'react';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';
import { Alert, Platform, StyleSheet } from 'react-native';

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
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(recordingUri);

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

  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone permission required', 'Allow microphone access to make a recording.');
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        allowsBackgroundRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Could not start recording', 'Try again after ending any other app that is using the microphone.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      setRecordingUri(recorder.uri);
    } catch {
      Alert.alert('Could not stop recording', 'The recording may have been interrupted by the device.');
    } finally {
      await setAudioModeAsync({ allowsBackgroundRecording: false, allowsRecording: false });
    }
  };

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

      {config.role === 'sender' ? (
        <ThemedView type="backgroundElement" style={styles.recorder}>
          <ThemedText type="smallBold">Microphone recording</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Start this yourself and get consent from everyone being recorded. Android will show a persistent recording notification. Phone-call audio from the other participant is not captured.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {recorderState.isRecording
              ? `Recording: ${Math.floor(recorderState.durationMillis / 1000)}s`
              : recordingUri
                ? 'Saved locally on this device.'
                : 'Not recording.'}
          </ThemedText>
          <PrimaryButton
            label={recorderState.isRecording ? 'Stop recording' : 'Start microphone recording'}
            onPress={recorderState.isRecording ? stopRecording : startRecording}
          />
          {recordingUri ? <PrimaryButton label="Play latest recording" onPress={() => player.play()} /> : null}
        </ThemedView>
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
  recorder: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
});
