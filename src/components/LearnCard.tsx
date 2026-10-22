import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, spacing, borderRadius, fontFamily, fontSize, typography, buildButtons } from '../utils/theme';
import { FlagItem } from '../types';
import { getFlagByName } from '../data';
import { getFlagAspect } from '../data/flagAssets';
import { flagName } from '../data/countryNames';
import { hapticTap } from '../utils/feedback';
import { t } from '../utils/i18n';
import FlagImage from './FlagImage';
import { useKeyShortcuts } from '../hooks/useKeyShortcuts';
import { useSwipe } from '../hooks/useSwipe';
import { useLayout } from '../utils/useLayout';
import { isContinueKey } from '../utils/shortcuts';

interface Props {
  /** What the player answered: a country name (English) or free text in hard mode. */
  picked: string;
  /** The flag they should have named. */
  answer: FlagItem;
  onDone: () => void;
}

/**
 * Shown after a wrong answer: the flag the player picked next to the right one,
 * so they can see the difference while it still matters. One tap to move on,
 * or swipe the sheet down (or left) on touch screens.
 */
export default function LearnCard({ picked, answer, onDone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const btn = useMemo(() => buildButtons(colors), [colors]);
  // Keep the sheet as wide as the game column, not the whole window
  const { screenWidth, gameWidth } = useLayout();
  const sideInset = Math.max(0, (screenWidth - gameWidth) / 2);
  const pickedFlag = getFlagByName(picked);
  const slide = useRef(new Animated.Value(0)).current;
  // How far the sheet is dragged down by a finger
  const drag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, tension: 90, friction: 12 }).start();
  }, [slide]);

  const handleDone = () => {
    hapticTap();
    onDone();
  };

  // Web: Enter or Space continues. Allowed from the (now locked) hard-mode text field too.
  useKeyShortcuts((key) => {
    if (!isContinueKey(key)) return false;
    handleDone();
    return true;
  }, { allowInInputs: true });

  const sheetSwipe = useSwipe({
    axis: 'both',
    onDrag: (_, dy) => drag.setValue(Math.max(0, dy)),
    onSwipe: (direction) => {
      if (direction !== 'down' && direction !== 'left') return false;
      handleDone();
      return true;
    },
    onEnd: (used) => {
      if (!used) Animated.spring(drag, { toValue: 0, useNativeDriver: true, tension: 120, friction: 12 }).start();
    },
  });

  // A sentence above each flag, e.g. "You picked Argentina", with the country in bold
  const column = (flag: FlagItem, labelKey: string) => {
    const name = flagName(flag);
    const sentence = t(labelKey, { name });
    const at = sentence.indexOf(name);
    return (
      <View style={styles.col}>
        <Text style={styles.label} numberOfLines={2}>
          {at < 0 ? sentence : (
            <>
              {sentence.slice(0, at)}
              <Text style={styles.name}>{name}</Text>
              {sentence.slice(at + name.length)}
            </>
          )}
        </Text>
        {/* Box matches the flag's real shape, so flags of the same shape look the same size */}
        <View style={[styles.flagBox, { aspectRatio: getFlagAspect(flag.id) }]}>
          <FlagImage countryCode={flag.id} size="medium" fill hideLabel transition={0} />
        </View>
      </View>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.scrim} />
      <Animated.View
        style={[
          styles.sheet,
          { left: sideInset, right: sideInset },
          {
            transform: [{
              translateY: Animated.add(slide.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }), drag),
            }],
          },
        ]}
        {...sheetSwipe}
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.title} accessibilityRole="header">{t('game.learnTitle')}</Text>
        <View style={styles.row}>
          {pickedFlag && pickedFlag.id !== answer.id && column(pickedFlag, 'game.youPicked')}
          {column(answer, 'game.answer')}
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
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    label: {
      fontFamily: fontFamily.body,
      fontSize: fontSize.body,
      color: colors.textSecondary,
      lineHeight: spacing.lg,
      // Room for two lines, so both flags stay level when one label wraps
      minHeight: spacing.lg * 2,
      marginBottom: spacing.xs,
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
