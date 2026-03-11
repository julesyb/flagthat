import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, buttons, borderRadius, layout } from '../utils/theme';
import {
  GameMode,
  DisplayMode,
  CategoryId,
  CategoryType,
  CATEGORIES,
  GameConfig,
} from '../types';
import { getCategoryCount, getTotalFlagCount } from '../data';
import { RootStackParamList } from '../types/navigation';
import BottomNav from '../components/BottomNav';
import { t } from '../utils/i18n';
import { hapticTap } from '../utils/feedback';
import {
  FlagIcon,
  LightningIcon,
  PuzzleIcon,
  ClockIcon,
  UsersIcon,
  LinkIcon,
  ChevronRightIcon,
} from '../components/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'GameSetup'>;

const QUESTION_COUNTS = [10, 20, 50, 100];
const FLAGPUZZLE_TIMES = [15, 30, 60];
const TIMEATTACK_TIMES = [30, 60, 90, 120];
const DEFAULT_GUESS_LIMIT = 3;
const GUESS_LIMIT_OPTIONS = [3, 5, 0] as const; // 0 = unlimited

type SetupMode = 'quiz' | 'flagflash' | 'flagpuzzle' | 'timeattack' | 'neighbors' | 'capitalconnection';
type QuizDifficulty = 'easy' | 'medium' | 'hard';

const SETUP_MODES: { key: SetupMode; labelKey: string; descKey: string; icon: (active: boolean) => React.ReactNode }[] = [
  { key: 'quiz', labelKey: 'setup.quiz', descKey: 'setup.quizDesc', icon: (a) => <FlagIcon size={18} color={a ? colors.white : colors.textSecondary} /> },
  { key: 'flagflash', labelKey: 'setup.flagFlash', descKey: 'setup.flagFlashDesc', icon: (a) => <LightningIcon size={18} color={a ? colors.white : colors.textSecondary} /> },
  { key: 'flagpuzzle', labelKey: 'setup.flagPuzzle', descKey: 'setup.flagPuzzleDesc', icon: (a) => <PuzzleIcon size={18} color={a ? colors.white : colors.textSecondary} /> },
  { key: 'timeattack', labelKey: 'setup.timedQuiz', descKey: 'setup.timedQuizDesc', icon: (a) => <ClockIcon size={18} color={a ? colors.white : colors.textSecondary} /> },
  { key: 'neighbors', labelKey: 'setup.neighbors', descKey: 'setup.neighborsDesc', icon: (a) => <UsersIcon size={18} color={a ? colors.white : colors.textSecondary} /> },
  { key: 'capitalconnection', labelKey: 'setup.capitalQuiz', descKey: 'setup.capitalQuizDesc', icon: (a) => <LinkIcon size={18} color={a ? colors.white : colors.textSecondary} /> },
];

const DIFFICULTIES: { key: QuizDifficulty; labelKey: string }[] = [
  { key: 'easy', labelKey: 'common.easy' },
  { key: 'medium', labelKey: 'common.medium' },
  { key: 'hard', labelKey: 'common.hard' },
];

// Compact config row for secondary options (matches HomeScreen pattern)
function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <View style={styles.configDivider} />
      <View style={styles.configRow}>
        <Text style={styles.configLbl}>{label}</Text>
        <View style={styles.segRow}>{children}</View>
      </View>
    </>
  );
}

// Small segmented button chip (matches HomeScreen segBtn)
function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, active && styles.segBtnOn]}
      onPress={() => { hapticTap(); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.segBtnText, active && styles.segBtnTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function GameSetupScreen({ navigation }: Props) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('flag');
  const [setupMode, setSetupMode] = useState<SetupMode>('quiz');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);
  const [timeLimit, setTimeLimit] = useState(60);
  const [filterType, setFilterType] = useState<CategoryType | null>(null);
  const [guessLimit, setGuessLimit] = useState(DEFAULT_GUESS_LIMIT);
  const [autocomplete, setAutocomplete] = useState(false);

  const totalFlags = getTotalFlagCount();
  const isFlagFlash = setupMode === 'flagflash';
  const isFlagPuzzle = setupMode === 'flagpuzzle';
  const isTimeAttack = setupMode === 'timeattack';
  const hasTimeLimit = isFlagFlash || isFlagPuzzle || isTimeAttack;
  const isQuiz = setupMode === 'quiz';

  // Resolve the actual GameMode from setup selections
  const resolvedMode: GameMode = isQuiz ? difficulty : (setupMode as GameMode);

  const showGuessLimit = setupMode !== 'timeattack' && setupMode !== 'flagpuzzle' && setupMode !== 'flagflash';
  const showMapToggle = isQuiz || isFlagPuzzle;

  // Set sensible default time limit when mode changes
  useEffect(() => {
    if (setupMode === 'flagflash') setTimeLimit(60);
    else if (setupMode === 'flagpuzzle') setTimeLimit(15);
    else if (setupMode === 'timeattack') setTimeLimit(60);
  }, [setupMode]);

  const handleFilterTypeSelect = (type: CategoryType) => {
    hapticTap();
    if (filterType === type) {
      setFilterType(null);
      setSelectedCategory('all');
    } else {
      setFilterType(type);
      setSelectedCategory('all');
      if (type === 'theme') {
        setQuestionCountAll(true);
      }
    }
  };

  const handleCategorySelect = (catId: CategoryId) => {
    hapticTap();
    setSelectedCategory(selectedCategory === catId ? 'all' : catId);
  };

  const startGame = () => {
    hapticTap();
    const effectiveQuestionCount = questionCountAll
      ? getCategoryCount(selectedCategory)
      : questionCount;

    const config: GameConfig = {
      mode: resolvedMode,
      category: selectedCategory,
      questionCount: (isTimeAttack || isFlagFlash) ? 999 : effectiveQuestionCount,
      displayMode,
      ...(hasTimeLimit && { timeLimit }),
      ...(difficulty === 'hard' && isQuiz && { autocomplete }),
      ...(showGuessLimit && guessLimit > 0 && { guessLimit }),
    };

    if (isTimeAttack) {
      navigation.navigate('Game', { config });
    } else if (isFlagFlash) {
      navigation.navigate('FlagFlash', { config });
    } else if (isFlagPuzzle) {
      navigation.navigate('FlagPuzzle', { config });
    } else if (setupMode === 'neighbors') {
      navigation.navigate('Neighbors', { config });
    } else if (setupMode === 'capitalconnection') {
      navigation.navigate('CapitalConnection', { config });
    } else {
      navigation.navigate('Game', { config });
    }
  };

  const filteredCategories = filterType
    ? CATEGORIES.filter((c) => c.type === filterType)
    : [];

  const getTimeLimitOptions = () => {
    if (isFlagPuzzle) return FLAGPUZZLE_TIMES;
    return TIMEATTACK_TIMES; // Used for both FlagFlash and Timed Quiz
  };

  const showQuestionCount = !isTimeAttack && !isFlagPuzzle && !isFlagFlash && filterType !== 'theme';

  const startButtonLabel = isQuiz
    ? t('setup.startQuiz', { difficulty: t(DIFFICULTIES.find((d) => d.key === difficulty)?.labelKey ?? 'common.medium') })
    : t('setup.startMode', { mode: t(SETUP_MODES.find((m) => m.key === setupMode)?.labelKey ?? 'setup.quiz') });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
        {/* Game Mode Grid */}
        <View style={styles.modeGrid}>
          {SETUP_MODES.map((m) => {
            const isActive = setupMode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeCard, isActive && styles.modeCardActive]}
                onPress={() => { hapticTap(); setSetupMode(m.key); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${t(m.labelKey)}: ${t(m.descKey)}`}
              >
                <View style={[styles.modeIconBadge, isActive && styles.modeIconBadgeActive]}>
                  {m.icon(isActive)}
                </View>
                <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                  {t(m.labelKey)}
                </Text>
                <Text style={[styles.modeDesc, isActive && styles.modeDescActive]}>
                  {t(m.descKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Options card - compact rows matching HomeScreen config style */}
        <View style={styles.configCard}>
          {/* Difficulty (only for Quiz mode) */}
          {isQuiz && (
            <ConfigRow label={t('home.difficulty')}>
              {DIFFICULTIES.map((d) => (
                <SegBtn
                  key={d.key}
                  label={t(d.labelKey)}
                  active={difficulty === d.key}
                  onPress={() => setDifficulty(d.key)}
                />
              ))}
            </ConfigRow>
          )}

          {/* Autocomplete (only for Hard quiz) */}
          {isQuiz && difficulty === 'hard' && (
            <ConfigRow label={t('home.hints')}>
              <SegBtn label={t('common.off')} active={!autocomplete} onPress={() => setAutocomplete(false)} />
              <SegBtn label={t('common.on')} active={autocomplete} onPress={() => setAutocomplete(true)} />
            </ConfigRow>
          )}

          {/* Display Mode (flag or map) */}
          {showMapToggle && (
            <ConfigRow label={t('setup.display')}>
              <SegBtn label={t('setup.displayFlag')} active={displayMode === 'flag'} onPress={() => setDisplayMode('flag')} />
              <SegBtn label={t('setup.displayMap')} active={displayMode === 'map'} onPress={() => setDisplayMode('map')} />
            </ConfigRow>
          )}

          {/* Guess Limit (only for standard quiz modes) */}
          {showGuessLimit && (
            <ConfigRow label={t('setup.lives')}>
              {GUESS_LIMIT_OPTIONS.map((v) => (
                <SegBtn
                  key={v}
                  label={v === 0 ? t('setup.unlimited') : String(v)}
                  active={guessLimit === v}
                  onPress={() => setGuessLimit(v)}
                />
              ))}
            </ConfigRow>
          )}

          {/* Time Limit (only for FlagFlash/FlagPuzzle/TimeAttack) */}
          {hasTimeLimit && (
            <ConfigRow label={t('setup.timeLimit')}>
              {getTimeLimitOptions().map((seconds) => (
                <SegBtn
                  key={seconds}
                  label={t('setup.timeSuffix', { t: seconds })}
                  active={timeLimit === seconds}
                  onPress={() => setTimeLimit(seconds)}
                />
              ))}
            </ConfigRow>
          )}

          {/* Question Count (for FlagPuzzle within time modes) */}
          {hasTimeLimit && isFlagPuzzle && (
            <ConfigRow label={t('setup.questions')}>
              {QUESTION_COUNTS.map((count) => (
                <SegBtn
                  key={count}
                  label={String(count)}
                  active={!questionCountAll && questionCount === count}
                  onPress={() => { setQuestionCount(count); setQuestionCountAll(false); }}
                />
              ))}
              <SegBtn
                label={t('common.all')}
                active={questionCountAll}
                onPress={() => setQuestionCountAll(true)}
              />
            </ConfigRow>
          )}

          {/* Question Count (everything except FlagFlash/TimeAttack/FlagPuzzle) */}
          {showQuestionCount && (
            <ConfigRow label={t('setup.questions')}>
              {QUESTION_COUNTS.map((count) => (
                <SegBtn
                  key={count}
                  label={String(count)}
                  active={!questionCountAll && questionCount === count}
                  onPress={() => { setQuestionCount(count); setQuestionCountAll(false); }}
                />
              ))}
              <SegBtn
                label={t('common.all')}
                active={questionCountAll}
                onPress={() => setQuestionCountAll(true)}
              />
            </ConfigRow>
          )}
        </View>

        {/* Filter */}
        <Text style={styles.sectionLabel}>{t('setup.filter')}</Text>
        <Text style={styles.filterHint}>{t('setup.filterDesc', { count: totalFlags })}</Text>

        <View style={styles.filterTypeRow}>
          {(['region', 'theme'] as CategoryType[]).map((type) => {
            const isActive = filterType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.filterTypeChip, isActive && styles.filterTypeChipActive]}
                onPress={() => handleFilterTypeSelect(type)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.filterTypeText, isActive && styles.filterTypeTextActive]}>
                  {type === 'region' ? t('setup.byRegion') : t('setup.byTheme')}
                </Text>
                <View style={isActive ? styles.chevronDown : undefined}>
                  <ChevronRightIcon
                    size={14}
                    color={isActive ? colors.white : colors.textTertiary}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filterType && (
          <View style={styles.categoryRow}>
            {filteredCategories.map((cat) => {
              const count = getCategoryCount(cat.id);
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => handleCategorySelect(cat.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${t(`categories.${cat.id}`)}, ${count} flags`}
                >
                  <View style={styles.categoryTextGroup}>
                    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                      {t(`categories.${cat.id}`)}
                    </Text>
                    <Text style={[styles.categoryCount, isActive && styles.categoryCountActive]}>
                      {t('browse.flagCountPlural', { count })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Bottom spacing for scroll */}
        <View style={{ height: spacing.md }} />
        </View>
      </ScrollView>

      {/* Pinned start button */}
      <View style={styles.startButtonWrap}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={startGame}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={startButtonLabel}
        >
          <Text style={styles.startButtonText}>{startButtonLabel}</Text>
        </TouchableOpacity>
      </View>

      <BottomNav
        activeTab="Modes"
        onNavigate={(tab) => {
          if (tab === 'Play') navigation.navigate('Home');
          else if (tab === 'Stats') navigation.navigate('Stats');
          else if (tab === 'Browse') navigation.navigate('Browse');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  contentInner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
  },

  // Screen title - prominent heading for the page
  screenTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Section labels - small eyebrow style for form sections
  sectionLabel: {
    ...typography.eyebrow,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  filterHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },

  // Mode grid - 2 column, hero element
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  modeCardActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  modeIconBadge: {
    width: 36,
    height: 36,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  modeIconBadgeActive: {
    backgroundColor: colors.whiteAlpha15,
  },
  modeLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  modeLabelActive: {
    color: colors.white,
  },
  modeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  modeDescActive: {
    color: colors.whiteAlpha60,
  },

  // Config card - compact rows matching HomeScreen pattern
  configCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.rule,
    overflow: 'hidden',
  },
  configDivider: {
    height: 1,
    backgroundColor: colors.rule,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  configLbl: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    minWidth: 72,
    flexShrink: 0,
  },
  segRow: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  segBtn: {
    flex: 1,
    maxWidth: 80,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.rule,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  segBtnOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  segBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 14,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  segBtnTextOn: {
    color: colors.white,
  },

  // Filter section
  filterTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTypeChip: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  filterTypeChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  filterTypeText: {
    ...typography.label,
    color: colors.text,
  },
  filterTypeTextActive: {
    color: colors.white,
  },
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },

  // Category chips - clean, no icon badges
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  categoryChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  categoryTextGroup: {
    gap: 1,
  },
  categoryLabel: {
    ...typography.label,
    color: colors.text,
  },
  categoryLabelActive: {
    color: colors.white,
  },
  categoryCount: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: fontSize.xxs,
  },
  categoryCountActive: {
    color: colors.whiteAlpha60,
  },

  // Pinned start button
  startButtonWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.background,
  },
  startButton: {
    ...buttons.primary,
  },
  startButtonText: {
    ...buttons.primaryText,
  },
});
