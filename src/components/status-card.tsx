import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type StatusCardProps = {
  title: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'error';
};

const toneColors = {
  default: undefined,
  success: '#1a7f37',
  warning: '#9a6700',
  error: '#cf222e',
} as const;

export function StatusCard({ title, value, hint, tone = 'default' }: StatusCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        {title}
      </ThemedText>
      <ThemedText type="subtitle" style={tone !== 'default' ? { color: toneColors[tone] } : undefined}>
        {value}
      </ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});
