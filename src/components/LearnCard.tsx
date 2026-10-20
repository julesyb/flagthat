import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, spacing, borderRadius, fontFamily, fontSize, typography, buildButtons } from '../utils/theme';
import { FlagItem } from '../types';
import { getFlagByName } from '../data';
import { flagName } from '../data/countryNames';
import { hapticTap } from '../utils/feedback';
import { t } from '../utils/i18n';
import FlagImage from './FlagImage';
import { useKeyShortcuts } from '../hooks/useKeyShortcuts';

interface Props {
  /** What the player answered: a country name (English) or free text in hard mode. */
  picked: string;
  /** The flag they should have named. */
  answer: FlagItem;
  onDone: () => void;
}

/**
 * Shown after a wrong answer: the flag the player picked next to the right one,
 * so they can see the difference while it still matters. One tap to move on.
 */
export default function LearnCard({ picked, answer, onDone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const btn = useMemo(() => buildButtons(colors), [colors]);
  const pickedFlag = getFlagByName(picked);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, tension: 90, friction: 12 }).start();
  }, [slide]);

  const handleDone = () => {
    hapticTap();
    onDone();
  };

  // Web: Enter or Space continues. Allowed from the (now locked) hard-mode text field too.
  useKeyShortcuts((key) => {
    if (key !== 'Enter' && key !== ' ') return false;
    handleDone();
    return true;
  }, { allowInInputs: true });

  const column = (flag: FlagItem, label: string) => (
    <View style={styles.col}>
      <View style={styles.flagBox}>
        <FlagImage countryCode={flag.id} size="medium" fill hideLabel transition={0} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.name} numberOfLines={2}>{flagName(flag)}</Text>
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.scrim} />
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }] },
        ]}
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.title} accessibilityRole="header">{t('game.learnTitle')}</Text>
        <View style={styles.row}>
          {pickedFlag && pickedFlag.id !== answer.id && column(pickedFlag, t('game.youPicked'))}
          {column(answer, t('game.answer'))}
        </View>
        <TouchableOpacity
          style={[btn.primary, styles.button]}
          onPress={handleDone}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('game.gotIt')}
        >
          <Text style={btn.primaryText}>{t('game.gotIt')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderColor: colors.border,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    title: {
      ...typography.title,
      fontSize: fontSize.lg + 2,
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    col: {
      flex: 1,
    },
    flagBox: {
      width: '100%',
      aspectRatio: 3 / 2,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    label: {
      fontFamily: fontFamily.body,
      fontSize: fontSize.sm,
      color: colors.textTertiary,
      marginTop: spacing.sm,
    },
    name: {
      fontFamily: fontFamily.bodyBold,
      fontSize: fontSize.body,
      color: colors.text,
    },
    button: {
      marginTop: spacing.lg,
    },
  });
