import React, { useState, useMemo, useRef } from 'react';
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
import { countryNeighbors, getCountriesWithNeighbors } from '../data/countryNeighbors';
import FlagImage from '../components/FlagImage';
import { CheckIcon, CrossIcon } from '../components/Icons';
import MapImage from '../components/MapImage';

type Props = NativeStackScreenProps<RootStackParamList, 'Neighbors'>;

const DISTRACTOR_COUNT = 4; // extra wrong flags to show

const flagById = new Map(countries.map((c) => [c.id, c]));

interface RoundData {
  country: FlagItem;
  neighborIds: string[];
  options: FlagItem[]; // neighbors + distractors, shuffled
}

function generateRounds(count: number): RoundData[] {
  const eligible = getCountriesWithNeighbors().filter(
    (code) => countryNeighbors[code].length >= 2,
  );
  const shuffled = shuffleArray(eligible).slice(0, count);

  return shuffled.map((code) => {
    const country = flagById.get(code)!;
    const neighborIds = countryNeighbors[code];
    const neighborFlags = neighborIds.map((id) => flagById.get(id)).filter(Boolean) as FlagItem[];

    // Pick distractors (non-neighbors, not the country itself)
    const excludeSet = new Set([code, ...neighborIds]);
    const allOther = countries.filter((c) => !excludeSet.has(c.id));
    const distractors = shuffleArray(allOther).slice(0, DISTRACTOR_COUNT);

    const options = shuffleArray([...neighborFlags, ...distractors]);
    return { country, neighborIds, options };
  });
}

export default function NeighborsScreen({ navigation, route }: Props) {
  const { config } = route.params;
  const rounds = useMemo(() => generateRounds(config.questionCount), []);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const round = rounds[roundIndex];
  const isLastRound = roundIndex >= rounds.length - 1;

  const toggleSelect = (id: string) => {
    if (submitted) return;
    hapticTap();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0 || submitted) return;
    setSubmitted(true);

    const neighborSet = new Set(round.neighborIds);
    const allCorrect =
      selected.size === neighborSet.size &&
      [...selected].every((id) => neighborSet.has(id));

    if (allCorrect) {
      hapticCorrect();
      playCorrectSound();
    } else {
      hapticWrong();
      playWrongSound();
    }

    const result: GameResult = {
      question: { flag: round.country, options: round.neighborIds },
      userAnswer: [...selected].join(','),
      correct: allCorrect,
      timeTaken: 0,
    };
    setResults((prev) => [...prev, result]);
  };

  const handleNext = () => {
    if (isLastRound) {
      const finalResults = [...results];
      const correct = finalResults.filter((r) => r.correct).length;
      const streak = getStreakFromResults(finalResults);
      updateStats(correct, finalResults.length, streak, 'neighbors', config.category);
      updateFlagResults(finalResults);
      navigation.replace('Results', { results: finalResults, config });
      return;
    }

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setRoundIndex((i) => i + 1);
      setSelected(new Set());
      setSubmitted(false);
    }, 150);
  };

  if (!round) return null;

  const neighborSet = new Set(round.neighborIds);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.exitButton}
          accessibilityRole="button"
          accessibilityLabel="Exit game"
        >
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.centerInfo}>
          <Text style={styles.counter}>
            {roundIndex + 1} / {rounds.length}
          </Text>
          <Text style={styles.score}>
            {results.filter((r) => r.correct).length} correct
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Question */}
          <Text style={styles.prompt}>Select all neighboring countries</Text>

          <View style={styles.flagCenter}>
            <FlagImage
              countryCode={round.country.id}
              emoji={round.country.emoji}
              size="large"
              style={{ borderRadius: borderRadius.md }}
            />
            <Text style={styles.countryName}>{round.country.name}</Text>
          </View>

          {/* Option Grid */}
          <View style={styles.optionsGrid}>
            {round.options.map((flag) => {
              const isSelected = selected.has(flag.id);
              const isNeighbor = neighborSet.has(flag.id);
              const showCorrect = submitted && isNeighbor;
              const showWrong = submitted && isSelected && !isNeighbor;
              const showMissed = submitted && isNeighbor && !isSelected;

              return (
                <TouchableOpacity
                  key={flag.id}
                  style={[
                    styles.optionCard,
                    isSelected && !submitted && styles.optionSelected,
                    showCorrect && styles.optionCorrect,
                    showWrong && styles.optionWrong,
                    showMissed && styles.optionMissed,
                  ]}
                  onPress={() => toggleSelect(flag.id)}
                  activeOpacity={0.7}
                  disabled={submitted}
                >
                  <FlagImage
                    countryCode={flag.id}
                    emoji={flag.emoji}
                    size="small"
                  />
                  {submitted && (
                    <View style={styles.resultBadge}>
                      {showCorrect && isSelected && <CheckIcon size={14} color={colors.success} />}
                      {showMissed && <CrossIcon size={14} color={colors.warning} />}
                      {showWrong && <CrossIcon size={14} color={colors.error} />}
                    </View>
                  )}
                  {!submitted && isSelected && (
                    <View style={styles.checkBadge}>
                      <CheckIcon size={12} color={colors.white} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.optionName,
                      submitted && isNeighbor && styles.optionNameCorrect,
                    ]}
                    numberOfLines={1}
                  >
                    {flag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Map after submission showing correct neighbors */}
          {submitted && (
            <View style={styles.mapSection}>
              <Text style={styles.mapLabel}>
                {round.country.name} has {round.neighborIds.length} neighbor{round.neighborIds.length !== 1 ? 's' : ''}
              </Text>
              <MapImage countryCode={round.country.id} size="hero" />
              <View style={styles.neighborList}>
                {round.neighborIds.map((id) => {
                  const f = flagById.get(id);
                  if (!f) return null;
                  return (
                    <View key={id} style={styles.neighborChip}>
                      <FlagImage countryCode={f.id} emoji={f.emoji} size="small" />
                      <Text style={styles.neighborChipText}>{f.name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        {!submitted ? (
          <TouchableOpacity
            style={[styles.submitButton, selected.size === 0 && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={selected.size === 0}
          >
            <Text style={styles.submitButtonText}>
              Submit ({selected.size} selected)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
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
    padding: 8,
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
  score: {
    ...typography.caption,
    color: colors.success,
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
  flagCenter: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  countryName: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  optionCard: {
    width: '30%',
    minWidth: 95,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  optionSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.surfaceSecondary,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  optionMissed: {
    borderColor: colors.warning,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
  },
  optionName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionNameCorrect: {
    color: colors.success,
    fontFamily: fontFamily.bodyBold,
  },
  resultBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  mapLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  neighborList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  neighborChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  neighborChipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.success,
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
  submitButton: {
    ...buttons.primary,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    ...buttons.primaryText,
  },
  nextButton: {
    ...buttons.primary,
  },
});
