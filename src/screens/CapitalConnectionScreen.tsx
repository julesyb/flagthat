import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, buttons, borderRadius } from '../utils/theme';
import { hapticTap, hapticCorrect, hapticWrong, playCorrectSound, playWrongSound } from '../utils/feedback';
import { updateStats, updateFlagResults } from '../utils/storage';
import { shuffleArray, getStreakFromResults } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { FlagItem, GameResult } from '../types';
import { countries } from '../data/countries';
import { countryCapitals } from '../data/countryCapitals';
import FlagImage from '../components/FlagImage';
import { CheckIcon, CrossIcon, ClockIcon } from '../components/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CapitalConnection'>;

const PAIRS_PER_ROUND = 6;
const ROUND_TIME = 60; // seconds

interface RoundData {
  flags: FlagItem[];
  capitals: { id: string; capital: string }[];
  shuffledCapitals: { id: string; capital: string }[];
}

function generateRounds(count: number): RoundData[] {
  // Only use countries that have a capital
  const eligible = countries.filter((c) => countryCapitals[c.id]);
  const rounds: RoundData[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const available = eligible.filter((c) => !usedIds.has(c.id));
    const pool = available.length >= PAIRS_PER_ROUND ? available : eligible;
    const selected = shuffleArray(pool).slice(0, PAIRS_PER_ROUND);
    selected.forEach((f) => usedIds.add(f.id));

    const capitals = selected.map((f) => ({
      id: f.id,
      capital: countryCapitals[f.id],
    }));

    rounds.push({
      flags: selected,
      capitals,
      shuffledCapitals: shuffleArray([...capitals]),
    });
  }
  return rounds;
}

export default function CapitalConnectionScreen({ navigation, route }: Props) {
  const { config } = route.params;
  const rounds = useMemo(() => generateRounds(config.questionCount), [config.questionCount]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [pairs, setPairs] = useState<Record<string, string>>({}); // flagId -> capitalId
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [timer, setTimer] = useState(ROUND_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  if (rounds.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No countries available</Text>
          <Text style={styles.emptyBody}>
            There are no countries with known capitals in the selected category.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const round = rounds[roundIndex];
  const isLastRound = roundIndex >= rounds.length - 1;
  const correctCount = results.filter((r) => r.correct).length;

  // Timer
  useEffect(() => {
    if (submitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimer(ROUND_TIME);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          // Auto-submit when timer runs out
          handleSubmitRef.current?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundIndex, submitted]);

  const handleSubmitRef = useRef<(() => void) | null>(null);

  const allPaired = Object.keys(pairs).length === PAIRS_PER_ROUND;

  const handleFlagTap = (flagId: string) => {
    if (submitted) return;
    hapticTap();

    if (selectedFlag === flagId) {
      setSelectedFlag(null);
      return;
    }

    // If this flag is already paired, unpair it
    if (pairs[flagId]) {
      setPairs((prev) => {
        const next = { ...prev };
        delete next[flagId];
        return next;
      });
    }

    setSelectedFlag(flagId);
  };

  const handleCapitalTap = (capitalId: string) => {
    if (submitted || !selectedFlag) return;
    hapticTap();

    // Check if this capital is already assigned to another flag
    const existingFlag = Object.entries(pairs).find(([, cId]) => cId === capitalId)?.[0];

    setPairs((prev) => {
      const next = { ...prev };
      // Remove old assignment for this capital
      if (existingFlag) delete next[existingFlag];
      // Assign to selected flag
      next[selectedFlag] = capitalId;
      return next;
    });
    setSelectedFlag(null);
  };

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    const roundResults: GameResult[] = round.flags.map((flag) => {
      const pairedCapitalId = pairs[flag.id];
      const isCorrect = pairedCapitalId === flag.id;
      if (isCorrect) correctCount++;

      return {
        question: { flag, options: [countryCapitals[flag.id]] },
        userAnswer: pairedCapitalId ? countryCapitals[pairedCapitalId] || 'None' : 'None',
        correct: isCorrect,
        timeTaken: (ROUND_TIME - timer) * 1000,
      };
    });

    if (correctCount === PAIRS_PER_ROUND) {
      hapticCorrect();
      playCorrectSound();
    } else {
      hapticWrong();
      playWrongSound();
    }

    setResults((prev) => [...prev, ...roundResults]);
  }, [submitted, round, pairs, timer]);

  // Keep ref updated
  handleSubmitRef.current = handleSubmit;

  const handleNext = () => {
    if (isLastRound) {
      const finalResults = [...results];
      const correct = finalResults.filter((r) => r.correct).length;
      const streak = getStreakFromResults(finalResults);
      updateStats(correct, finalResults.length, streak, 'capitalconnection', config.category);
      updateFlagResults(finalResults);
      navigation.replace('Results', { results: finalResults, config });
      return;
    }

    fadeAnim.setValue(1);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setRoundIndex((i) => i + 1);
      setPairs({});
      setSelectedFlag(null);
      setSubmitted(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  };

  const pairedCapitalIds = new Set(Object.values(pairs));
  const inversePairs = Object.fromEntries(Object.entries(pairs).map(([k, v]) => [v, k]));

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.exitButton}
          accessibilityRole="button"
        >
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.centerInfo}>
          <Text style={styles.counter}>
            {roundIndex + 1} / {rounds.length}
          </Text>
          <Text style={styles.scoreText}>{correctCount} correct</Text>
          <View style={styles.timerRow}>
            <ClockIcon size={14} color={timer <= 10 ? colors.accent : colors.textTertiary} />
            <Text style={[styles.timerText, timer <= 10 && styles.timerTextUrgent]}>
              {timer}s
            </Text>
          </View>
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.prompt}>Match flags to capitals</Text>

          {/* Flags Row */}
          <Text style={styles.sectionLabel}>Flags</Text>
          <View style={styles.flagsRow}>
            {round.flags.map((flag) => {
              const isActive = selectedFlag === flag.id;
              const isPaired = !!pairs[flag.id];
              const isCorrect = submitted && pairs[flag.id] === flag.id;
              const isWrong = submitted && pairs[flag.id] && pairs[flag.id] !== flag.id;

              return (
                <TouchableOpacity
                  key={flag.id}
                  style={[
                    styles.flagCard,
                    isActive && styles.flagCardActive,
                    isPaired && !submitted && styles.flagCardPaired,
                    isCorrect && styles.flagCardCorrect,
                    isWrong && styles.flagCardWrong,
                  ]}
                  onPress={() => handleFlagTap(flag.id)}
                  activeOpacity={0.7}
                  disabled={submitted}
                >
                  <FlagImage
                    countryCode={flag.id}
                    emoji={flag.emoji}
                    size="small"
                  />
                  {submitted && (
                    <View style={styles.flagResultIcon}>
                      {isCorrect ? (
                        <CheckIcon size={12} color={colors.success} />
                      ) : (
                        <CrossIcon size={12} color={colors.error} />
                      )}
                    </View>
                  )}
                  {isPaired && !submitted && (
                    <View style={styles.pairedDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Capitals List */}
          <Text style={styles.sectionLabel}>Capitals</Text>
          <View style={styles.capitalsList}>
            {round.shuffledCapitals.map((cap) => {
              const isUsed = pairedCapitalIds.has(cap.id);
              const pairedFlagId = inversePairs[cap.id];
              const isCorrect = submitted && pairedFlagId === cap.id;
              const isWrong = submitted && pairedFlagId && pairedFlagId !== cap.id;
              const isUnmatched = submitted && !pairedFlagId;

              return (
                <TouchableOpacity
                  key={cap.id}
                  style={[
                    styles.capitalCard,
                    isUsed && !submitted && styles.capitalCardUsed,
                    isCorrect && styles.capitalCardCorrect,
                    isWrong && styles.capitalCardWrong,
                    isUnmatched && styles.capitalCardWrong,
                  ]}
                  onPress={() => handleCapitalTap(cap.id)}
                  activeOpacity={0.7}
                  disabled={submitted || !selectedFlag}
                >
                  <Text
                    style={[
                      styles.capitalText,
                      isUsed && !submitted && styles.capitalTextUsed,
                      isCorrect && styles.capitalTextCorrect,
                      isWrong && styles.capitalTextWrong,
                    ]}
                  >
                    {cap.capital}
                  </Text>
                  {submitted && isCorrect && (
                    <CheckIcon size={14} color={colors.success} />
                  )}
                  {submitted && (isWrong || isUnmatched) && (
                    <CrossIcon size={14} color={colors.error} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* After submission: show correct answers */}
          {submitted && (
            <View style={styles.answerCard}>
              <Text style={styles.answerTitle}>Correct Answers</Text>
              {round.flags.map((flag) => (
                <View key={flag.id} style={styles.answerRow}>
                  <FlagImage countryCode={flag.id} emoji={flag.emoji} size="small" />
                  <View style={styles.answerText}>
                    <Text style={styles.answerCountry}>{flag.name}</Text>
                    <Text style={styles.answerCapital}>{countryCapitals[flag.id]}</Text>
                  </View>
                  {pairs[flag.id] === flag.id ? (
                    <CheckIcon size={16} color={colors.success} />
                  ) : (
                    <CrossIcon size={16} color={colors.error} />
                  )}
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        {!submitted ? (
          <TouchableOpacity
            style={[styles.actionButton, !allPaired && styles.actionButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!allPaired}
          >
            <Text style={styles.actionButtonText}>
              Submit ({Object.keys(pairs).length}/{PAIRS_PER_ROUND} paired)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              {isLastRound ? 'See Results' : 'Next'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: {
    padding: spacing.sm,
    width: 60,
  },
  exitText: {
    fontSize: 13,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.5,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  centerInfo: {
    alignItems: 'center',
  },
  counter: {
    ...typography.bodyBold,
    color: colors.text,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerText: {
    ...typography.captionBold,
    color: colors.textTertiary,
  },
  timerTextUrgent: {
    color: colors.accent,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  prompt: {
    ...typography.headingUpper,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.eyebrow,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  flagCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  flagCardActive: {
    borderColor: colors.ink,
    backgroundColor: colors.surfaceSecondary,
  },
  flagCardPaired: {
    borderColor: colors.slate,
  },
  flagCardCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  flagCardWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  flagResultIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  pairedDot: {
    position: 'absolute',
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  capitalsList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  capitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
  },
  capitalCardUsed: {
    borderColor: colors.slate,
    backgroundColor: colors.surfaceSecondary,
  },
  capitalCardCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  capitalCardWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  capitalText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: colors.ink,
  },
  capitalTextUsed: {
    color: colors.slate,
  },
  capitalTextCorrect: {
    color: colors.success,
  },
  capitalTextWrong: {
    color: colors.error,
  },
  answerCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  answerTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  answerText: {
    flex: 1,
  },
  answerCountry: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  answerCapital: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  spacer: { width: 60 },
  scoreText: { ...typography.caption, color: colors.success },
  actionButton: { ...buttons.primary },
  actionButtonDisabled: { opacity: 0.4 },
  actionButtonText: { ...buttons.primaryText },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { ...buttons.secondary },
  emptyButtonText: { ...buttons.secondaryText },
});
