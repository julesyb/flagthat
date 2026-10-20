import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, spacing, borderRadius, fontFamily, fontSize } from '../utils/theme';
import { FlameIcon } from './Icons';
import { t } from '../utils/i18n';

const MAX_PIPS = 7;

interface Props {
  days: number;
  onPress?: () => void;
  accessibilityHint?: string;
}

/** Day streak pill: flame, streak number, and up to 7 pip dots. */
export default function StreakPill({ days, onPress, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const active = days > 0;
  const lit = Math.min(days, MAX_PIPS);

  const content = (
    <>
      <FlameIcon size={16} color={active ? colors.goldBright : colors.textTertiary} />
      <Text style={[styles.num, !active && styles.numInactive]}>{days}</Text>
      <View style={styles.pips}>
        {Array.from({ length: MAX_PIPS }).map((_, i) => (
          <View key={i} style={[styles.pip, i < lit && styles.pipLit]} />
        ))}
      </View>
    </>
  );

  const label = t('home.streakA11y', { count: days });

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.pill}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.pill} accessible accessibilityLabel={label}>
      {content}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    num: {
      fontFamily: fontFamily.display,
      fontSize: fontSize.lg,
      color: colors.gold,
      lineHeight: 22,
    },
    numInactive: {
      color: colors.textTertiary,
    },
    pips: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pip: {
      width: 6,
      height: 6,
      borderRadius: borderRadius.full,
      backgroundColor: colors.pipInactive,
    },
    pipLit: {
      backgroundColor: colors.pipActive,
    },
  });
