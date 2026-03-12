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
  accessibilityLabel?: string;
}

export default function SegBtn({ label, active, onPress, maxWidth = 80, accessibilityLabel }: SegBtnProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.segBtn, { maxWidth }, active && styles.segBtnOn]}
      onPress={() => { hapticTap(); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.segBtnText, active && styles.segBtnTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  segBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.rule,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
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
  segBtnTextOn: {
    color: colors.playText,
  },
});

