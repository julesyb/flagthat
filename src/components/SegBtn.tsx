import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontFamily, fontSize, borderRadius } from '../utils/theme';
import { hapticTap } from '../utils/feedback';

interface SegBtnProps {
  label: string;
  active: boolean;
  onPress: () => void;
  maxWidth?: number;
}

export default function SegBtn({ label, active, onPress, maxWidth = 80 }: SegBtnProps) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, { maxWidth }, active && styles.segBtnOn]}
      onPress={() => { hapticTap(); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.segBtnText, active && styles.segBtnTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.caption,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  segBtnTextOn: {
    color: colors.background,
  },
});
