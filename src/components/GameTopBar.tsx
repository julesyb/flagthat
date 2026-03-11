import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, nav } from '../utils/theme';
import { t } from '../utils/i18n';

interface GameTopBarProps {
  onExit: () => void;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * Shared top bar for all game screens.
 * Provides a consistent Exit button on the left, with optional center and right slots.
 */
export default function GameTopBar({ onExit, center, right }: GameTopBarProps) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={onExit}
        style={styles.exitButton}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('common.exit')}
      >
        <Text style={styles.exitText}>{t('common.exit')}</Text>
      </TouchableOpacity>
      <View style={styles.centerSlot}>{center}</View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: {
    ...nav.backButton,
  },
  exitText: {
    ...nav.backText,
  },
  centerSlot: {
    alignItems: 'center',
  },
  spacer: {
    width: 60,
  },
});
