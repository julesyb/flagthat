import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, spacing, nav, fontFamily, fontSize, borderRadius } from '../utils/theme';
import { useLayout } from '../utils/useLayout';
import { t } from '../utils/i18n';

interface GameTopBarProps {
  onExit: () => void;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * Shared top bar for all game screens.
 * Provides a consistent Exit button on the left, with optional center and right slots.
 * Escape key triggers exit on desktop web.
 */
export default function GameTopBar({ onExit, center, right }: GameTopBarProps) {
  const { isDesktop } = useLayout();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onExit]);

  return (
    <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
      <TouchableOpacity
        onPress={onExit}
        style={styles.exitButton}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('common.exit')}
      >
        <Text style={styles.exitText}>{t('common.exit')}</Text>
        {isDesktop && <Text style={styles.escHint}>Esc</Text>}
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
  topBarDesktop: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  exitButton: {
    ...nav.backButton,
  },
  exitText: {
    ...nav.backText,
  },
  escHint: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    color: colors.textTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: spacing.xs,
    overflow: 'hidden',
  },
  centerSlot: {
    alignItems: 'center',
  },
  spacer: {
    width: 60,
  },
});
