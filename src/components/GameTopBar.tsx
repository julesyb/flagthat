import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, buildNav, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';
import { CrossIcon } from './Icons';

interface GameTopBarProps {
  onExit: () => void;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * Shared top bar for all game screens.
 * Provides a consistent close (X) button on the left, with optional center and right slots.
 */
export default function GameTopBar({ onExit, center, right }: GameTopBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={onExit}
        style={styles.exitButton}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('common.exit')}
      >
        <CrossIcon size={20} color={colors.textTertiary} />
      </TouchableOpacity>
      <View style={styles.centerSlot}>{center}</View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => {
  const n = buildNav(colors);
  return StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: {
    ...n.backButton,
    marginLeft: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSlot: {
    alignItems: 'center',
  },
  spacer: {
    width: 60,
  },
  });
};

