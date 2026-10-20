import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { fontFamily, fontSize, spacing, borderRadius, typography, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';
import { hapticCorrect, hapticWrong, playWrongSound } from '../utils/feedback';
import { getFactForDate, getFactContent } from '../data/facts';
import { getDailyFactState, saveDailyFactAnswer } from '../utils/storage';
import { GlobeIcon, CheckIcon } from './Icons';
import FlagImage from './FlagImage';

/**
 * Fact of the Day — an inline trivia card on the home screen.
 * One curated, accurate geography/flag fact is shown per day, deterministic
 * from the date so every player sees the same one. The card reveals the
 * answer and an interesting takeaway once the player picks an option, and
 * remembers their answer for the rest of the day.
 */
export default function FactOfDay() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fact = useMemo(() => getFactForDate(), []);
  const content = useMemo(() => getFactContent(fact), [fact]);

  const [picked, setPicked] = useState<number | null>(null);
  const optAnims = useRef(content.options.map(() => new Animated.Value(0))).current;

  // Restore today's answer (if any) and pop the options in.
  useEffect(() => {
    let active = true;
    getDailyFactState()
      .then((state) => {
        if (active && state && state.factId === fact.id) {
          setPicked(state.pickedIndex);
        }
      })
      .catch(() => {});

    const timer = setTimeout(() => {
      Animated.stagger(
        80,
        optAnims.map((a) => Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 })),
      ).start();
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fact.id]);

  const handlePick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === fact.answer) {
      hapticCorrect();
    } else {
      hapticWrong();
      playWrongSound();
    }
    saveDailyFactAnswer(fact.id, idx).catch(() => {});
  };

  const answered = picked !== null;

  const renderOption = (label: string, idx: number) => {
    const isCorrect = idx === fact.answer;
    const isSelected = picked === idx;
    const showCorrect = answered && isCorrect;
    const showWrong = isSelected && !isCorrect;
    return (
      <Animated.View
        key={idx}
        style={[
          styles.optWrap,
          { opacity: optAnims[idx], transform: [{ scale: optAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.optBtn, showCorrect && styles.optCorrect, showWrong && styles.optWrong]}
          onPress={() => handlePick(idx)}
          activeOpacity={0.8}
          disabled={answered}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: answered, selected: isSelected }}
        >
          <Text
            style={[styles.optText, showCorrect && styles.optTextCorrect, showWrong && styles.optTextWrong]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <GlobeIcon size={14} color={colors.goldText} />
        <Text style={styles.eyebrow}>{t('home.factOfDay')}</Text>
      </View>

      {fact.flagId && (
        <View style={styles.flagWrap}>
          <FlagImage countryCode={fact.flagId} size="medium" fill style={styles.flag} />
        </View>
      )}

      <Text style={styles.question}>{content.question}</Text>

      <View style={styles.optsGrid}>
        <View style={styles.optsRow}>{content.options.slice(0, 2).map((opt, i) => renderOption(opt, i))}</View>
        <View style={styles.optsRow}>{content.options.slice(2, 4).map((opt, i) => renderOption(opt, i + 2))}</View>
      </View>

      {answered && (
        <View style={styles.reveal} accessibilityLiveRegion="polite">
          <View style={styles.revealHead}>
            <CheckIcon size={12} color={colors.goldText} />
            <Text style={styles.revealLabel}>{t('home.factDidYouKnow')}</Text>
          </View>
          <Text style={styles.revealText}>{content.fact}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.rule,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.goldText,
  },
  flagWrap: {
    alignSelf: 'center',
    width: 120,
    aspectRatio: 3 / 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginTop: spacing.xxs,
  },
  flag: {
    borderRadius: borderRadius.sm,
  },
  question: {
    ...typography.bodyBold,
    color: colors.ink,
    marginTop: spacing.xxs,
  },

  // Options 2x2
  optsGrid: {
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  optsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optWrap: {
    flex: 1,
  },
  optBtn: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optCorrect: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  optWrong: {
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
  },
  optText: {
    ...typography.label,
    color: colors.ink,
    textAlign: 'center',
  },
  optTextCorrect: {
    color: colors.success,
  },
  optTextWrong: {
    color: colors.error,
  },

  // Reveal block
  reveal: {
    backgroundColor: colors.goldAlpha15,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  revealHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  revealLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.goldText,
  },
  revealText: {
    ...typography.caption,
    color: colors.ink,
    lineHeight: 19,
  },
});
