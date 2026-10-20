import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, buildNav, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';
import { CrossIcon } from './Icons';
import { useKeyShortcuts } from '../hooks/useKeyShortcuts';
import { arrowStep } from '../utils/shortcuts';
import { moveWebFocus } from '../utils/webInput';

/** DOM id of the bar on web, so arrow keys skip the exit button. */
const BAR_ID = 'game-top-bar';

interface GameTopBarProps {
  onExit: () => void;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * Shared top bar for all game screens.
 * Provides a consistent close (X) button on the left, with optional center and right slots.
 * Web keys: Esc exits (even while typing), arrow keys move focus between answers.
 */
export default function GameTopBar({ onExit, center, right }: GameTopBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useKeyShortcuts((key) => {
    if (key !== 'Escape') return false;
    onExit();
    return true;
  }, { allowInInputs: true, capture: true });

  useKeyShortcuts((key) => {
    const step = arrowStep(key, 'both');
    return step !== 0 && moveWebFocus(step, BAR_ID);
  });

  return (
    <View style={styles.topBar} nativeID={BAR_ID}>
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

