import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, fontFamily, fontSize, borderRadius, typography, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { hapticTap } from '../utils/feedback';

interface SegBtnProps {
  label: string;
  active: boolean;
  onPress: () => void;
  maxWidth?: number;
  /** Tighter padding + smaller text for dense layouts (e.g. the Home config). */
  compact?: boolean;
  accessibilityLabel?: string;
}

export default function SegBtn({ label, active, onPress, maxWidth = 80, compact = false, accessibilityLabel }: SegBtnProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.segBtn, compact && styles.segBtnCompact, { maxWidth }, active && styles.segBtnOn]}
      onPress={() => { hapticTap(); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.segBtnText, compact && styles.segBtnTextCompact, active && styles.segBtnTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  segBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  segBtnCompact: {
    paddingVertical: spacing.xs - 1,
    borderWidth: 1,
    // Keep the visual size tight, but guarantee a comfortable tap target.
    minHeight: 40,
    justifyContent: 'center',
  },
  segBtnOn: {
    backgroundColor: colors.goldBright,
    borderColor: colors.goldBright,
  },
  segBtnText: {
    ...typography.actionLabel,
    letterSpacing: 0,
    color: colors.textTertiary,
  },
  segBtnTextCompact: {
    fontSize: fontSize.sm,
  },
  segBtnTextOn: {
    color: colors.playText,
  },
});

