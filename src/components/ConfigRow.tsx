import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily, fontSize, spacing, borderRadius } from '../utils/theme';

interface ConfigRowProps {
  label: string;
  children: React.ReactNode;
  showDivider?: boolean;
}

/**
 * Compact config row for settings-style controls.
 * Shared between HomeScreen and GameSetupScreen.
 */
export default function ConfigRow({ label, children, showDivider = true }: ConfigRowProps) {
  return (
    <>
      {showDivider && <View style={styles.divider} />}
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.controls}>{children}</View>
      </View>
    </>
  );
}

/** Card wrapper for groups of ConfigRows. */
export function ConfigCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.rule,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.rule,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.ink,
    minWidth: 58,
    flexShrink: 0,
  },
  controls: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
});
