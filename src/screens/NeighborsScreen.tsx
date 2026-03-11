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
import { hapticTap, hapticCorrect, hapticWrong, playWrongSound } from '../utils/feedback';
import { updateStats, updateFlagResults } from '../utils/storage';
import { shuffleArray, getStreakFromResults } from '../utils/gameEngine';
import { t } from '../utils/i18n';
import { RootStackParamList } from '../types/navigation';
import { FlagItem, GameResult } from '../types';
import { countries } from '../data/countries';
import { countryNeighbors, getCountriesWithNeighbors } from '../data/countryNeighbors';
import FlagImage from '../components/FlagImage';
import { CheckIcon, CrossIcon } from '../components/Icons';
import MapImage from '../components/MapImage';

type Props = NativeStackScreenProps<RootStackParamList, 'Neighbors'>;

const MAX_OPTIONS = 12;
const MIN_DISTRACTORS = 3;

const flagById = new Map(countries.map((c) => [c.id, c]));

interface RoundData {
  country: FlagItem;
  neighborIds: string[];
  options: FlagItem[];
}

function generateRounds(count: number): RoundData[] {
  const eligible = getCountriesWithNeighbors().filter(
    (code) => countryNeighbors[code].length >= 2 && flagById.has(code),
  );
  if (eligible.length === 0) return [];

  const shuffled = shuffleArray(eligible).slice(0, count);

  return shuffled.map((code) => {
    const country = flagById.get(code)!;
    const neighborIds = countryNeighbors[code].filter((id) => flagById.has(id));
    // Cap neighbors so total options stay within MAX_OPTIONS
    const cappedNeighborIds = neighborIds.length > MAX_OPTIONS - MIN_DISTRACTORS
      ? shuffleArray(neighborIds).slice(0, MAX_OPTIONS - MIN_DISTRACTORS)
      : neighborIds;
    const neighborFlags = cappedNeighborIds.map((id) => flagById.get(id)!);

    const distractorCount = Math.max(MIN_DISTRACTORS, MAX_OPTIONS - cappedNeighborIds.length);
    const excludeSet = new Set([code, ...neighborIds]);
    const allOther = countries.filter((c) => !excludeSet.has(c.id));
    const distractors = shuffleArray(allOther).slice(0, distractorCount);

    return {
      country,
      neighborIds: cappedNeighborIds,
      options: shuffleArray([...neighborFlags, ...distractors]),
    };
  });
}

export default function NeighborsScreen({ navigation, route }: Props) {
  const { config } = route.params;
  const rounds = useMemo(() => generateRounds(config.questionCount), [config.questionCount]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const roundStartTime = useRef(Date.now());

  // Empty rounds — not enough eligible countries
  if (rounds.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('neighbors.noCountries')}</Text>
          <Text style={styles.emptyBody}>
            {t('neighbors.noCountriesDesc')}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const guessLimit = config.guessLimit ?? 0;
  const wrongCount = results.filter((r) => !r.correct).length;

  const round = rounds[roundIndex];
  const isLastRound = roundIndex >= rounds.length - 1;
  const neighborSet = new Set(round.neighborIds);
  const correctCount = results.filter((r) => r.correct).length;

  const toggleSelect = (id: string) => {
    if (submitted) return;
    hapticTap();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0 || submitted) return;
    setSubmitted(true);

    const allCorrect =
      selected.size === neighborSet.size &&
      [...selected].every((id) => neighborSet.has(id));

    if (allCorrect) { hapticCorrect(); }
    else { hapticWrong(); playWrongSound(); }

    setResults((prev) => [...prev, {
      question: { flag: round.country, options: round.neighborIds },
      userAnswer: [...selected].join(','),
      correct: allCorrect,
      timeTaken: Date.now() - roundStartTime.current,
    }]);
  };

  const handleNext = () => {
    const currentResults = [...results];
    const isEliminated = guessLimit > 0 && currentResults.filter((r) => !r.correct).length >= guessLimit;
    if (isLastRound || isEliminated) {
      navigation.replace('Results', { results: currentResults, config });
      return;
    }

    fadeAnim.setValue(1);
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setRoundIndex((i) => i + 1);
      setSelected(new Set());
      setSubmitted(false);
      roundStartTime.current = Date.now();
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.exitButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.exit')}
        >
          <Text style={styles.exitText}>{t('common.exit')}</Text>
        </TouchableOpacity>
        <View style={styles.centerInfo}>
          <Text style={styles.counter}>
            {t('game.questionOf', { current: roundIndex + 1, total: rounds.length })}
          </Text>
          <Text style={styles.scoreText}>{t('game.correctCount', { count: correctCount })}</Text>
        </View>
        {guessLimit > 0 ? (
          <Text style={styles.livesText}>{guessLimit - wrongCount === 1 ? t('game.life', { count: Math.max(0, guessLimit - wrongCount) }) : t('game.lives', { count: Math.max(0, guessLimit - wrongCount) })}</Text>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.prompt}>{t('neighbors.selectAll')}</Text>

          <View style={styles.flagCenter}>
            <FlagImage
              countryCode={round.country.id}
              emoji={round.country.emoji}
              size="large"
            />
            <Text style={styles.countryName}>{round.country.name}</Text>
          </View>

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
                    showCorrect && isSelected && styles.optionCorrect,
                    showCorrect && !isSelected && styles.optionMissed,
                    showWrong && styles.optionWrong,
                  ]}
                  onPress={() => toggleSelect(flag.id)}
                  activeOpacity={0.7}
                  disabled={submitted}
                >
                  <FlagImage countryCode={flag.id} emoji={flag.emoji} size="small" />
                  {submitted && showCorrect && isSelected && (
                    <View style={[styles.resultBadgeCircle, styles.resultBadgeCorrect]}>
                      <CheckIcon size={12} color={colors.white} />
                    </View>
                  )}
                  {submitted && showMissed && (
                    <View style={[styles.resultBadgeCircle, styles.resultBadgeMissed]}>
                      <Text style={styles.resultBadgeText}>!</Text>
                    </View>
                  )}
                  {submitted && showWrong && (
                    <View style={[styles.resultBadgeCircle, styles.resultBadgeWrong]}>
                      <CrossIcon size={12} color={colors.white} />
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
                      submitted && showCorrect && isSelected && styles.optionNameCorrect,
                      submitted && showMissed && styles.optionNameMissed,
                      submitted && showWrong && styles.optionNameWrong,
                    ]}
                    numberOfLines={1}
                  >
                    {flag.name}
                  </Text>
                  {submitted && showMissed && (
                    <Text style={styles.missedLabel}>{t('neighbors.missed')}</Text>
                  )}
                  {submitted && showWrong && (
                    <Text style={styles.wrongLabel}>{t('neighbors.notANeighbor')}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {submitted && (
            <View style={styles.mapSection}>
              <Text style={styles.mapLabel}>
                {round.neighborIds.length === 1 ? t('neighbors.neighborCount', { name: round.country.name, count: round.neighborIds.length }) : t('neighbors.neighborCountPlural', { name: round.country.name, count: round.neighborIds.length })}
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

      <View style={styles.bottomBar}>
        {!submitted ? (
          <TouchableOpacity
            style={[styles.actionButton, selected.size === 0 && styles.actionButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={selected.size === 0}
          >
            <Text style={styles.actionButtonText}>{t('neighbors.submitSelected', { count: selected.size })}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.actionButtonText}>{isLastRound ? t('common.seeResults') : t('common.next')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: { padding: spacing.sm, width: 60 },
  exitText: {
    fontSize: 13,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.5,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  centerInfo: { alignItems: 'center' },
  counter: { ...typography.bodyBold, color: colors.text },
  scoreText: { ...typography.caption, color: colors.success },
  spacer: { width: 60 },
  livesText: { ...typography.bodyBold, color: colors.error, width: 60, textAlign: 'right' },
  content: { padding: spacing.lg, paddingBottom: 120 },
  prompt: { ...typography.headingUpper, color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  flagCenter: { alignItems: 'center', marginBottom: spacing.lg },
  countryName: { fontFamily: fontFamily.display, fontSize: 22, color: colors.ink, marginTop: spacing.sm },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
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
  optionSelected: { borderColor: colors.ink, backgroundColor: colors.surfaceSecondary },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.error, backgroundColor: colors.errorBg },
  optionMissed: { borderColor: colors.warning, backgroundColor: colors.warningBg },
  optionName: { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  optionNameCorrect: { color: colors.success, fontFamily: fontFamily.bodyBold },
  optionNameMissed: { color: colors.warning, fontFamily: fontFamily.bodyBold },
  optionNameWrong: { color: colors.error },
  missedLabel: { fontFamily: fontFamily.uiLabel, fontSize: 8, letterSpacing: 1, color: colors.warning, textTransform: 'uppercase' },
  wrongLabel: { fontFamily: fontFamily.uiLabel, fontSize: 8, letterSpacing: 0.5, color: colors.error, textTransform: 'uppercase' },
  resultBadgeCircle: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBadgeCorrect: { backgroundColor: colors.success },
  resultBadgeMissed: { backgroundColor: colors.warning },
  resultBadgeWrong: { backgroundColor: colors.error },
  resultBadgeText: { fontFamily: fontFamily.uiLabel, fontSize: 12, color: colors.white },
  checkBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapSection: { marginTop: spacing.xl, alignItems: 'center' },
  mapLabel: { ...typography.captionBold, color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase' },
  neighborList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'center' },
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
  neighborChipText: { fontFamily: fontFamily.bodyMedium, fontSize: 12, color: colors.success },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  actionButton: { ...buttons.primary },
  actionButtonDisabled: { opacity: 0.4 },
  actionButtonText: { ...buttons.primaryText },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { ...buttons.secondary },
  emptyButtonText: { ...buttons.secondaryText },
});
