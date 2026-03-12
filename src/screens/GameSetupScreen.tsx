import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spacing, typography, fontFamily, fontSize, buildButtons, borderRadius, shadows, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
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
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import { t } from '../utils/i18n';
import { hapticTap } from '../utils/feedback';
import SegBtn from '../components/SegBtn';
import ConfigRow, { ConfigCard } from '../components/ConfigRow';
import {
  FlagIcon,
  LightningIcon,
  PuzzleIcon,
  ClockIcon,
  UsersIcon,
  LinkIcon,
  ChevronRightIcon,
} from '../components/Icons';
import {
  SETUP_QUESTION_COUNTS,
  FLAGPUZZLE_TIMES,
  TIMEATTACK_TIMES,
  DEFAULT_GUESS_LIMIT,
  GUESS_LIMIT_OPTIONS,
  UNLIMITED_QUESTIONS,
} from '../utils/config';

type Props = NativeStackScreenProps<RootStackParamList, 'GameSetup'>;

type SetupMode = 'quiz' | 'flashflag' | 'flagpuzzle' | 'timeattack' | 'neighbors' | 'capitalconnection';
type QuizDifficulty = 'easy' | 'medium' | 'hard';

const SETUP_MODES: { key: SetupMode; labelKey: string; descKey: string; icon: (active: boolean, colors: ThemeColors) => React.ReactNode }[] = [
  { key: 'quiz', labelKey: 'setup.quiz', descKey: 'setup.quizDesc', icon: (a, c) => <FlagIcon size={22} color={a ? c.goldBright : c.textTertiary} filled={a} /> },
  { key: 'flashflag', labelKey: 'setup.flashFlag', descKey: 'setup.flashFlagDesc', icon: (a, c) => <LightningIcon size={22} color={a ? c.goldBright : c.textTertiary} filled={a} /> },
  { key: 'flagpuzzle', labelKey: 'setup.flagPuzzle', descKey: 'setup.flagPuzzleDesc', icon: (a, c) => <PuzzleIcon size={22} color={a ? c.goldBright : c.textTertiary} /> },
  { key: 'timeattack', labelKey: 'setup.timedQuiz', descKey: 'setup.timedQuizDesc', icon: (a, c) => <ClockIcon size={22} color={a ? c.goldBright : c.textTertiary} /> },
  { key: 'neighbors', labelKey: 'setup.neighbors', descKey: 'setup.neighborsDesc', icon: (a, c) => <UsersIcon size={22} color={a ? c.goldBright : c.textTertiary} /> },
  { key: 'capitalconnection', labelKey: 'setup.capitalQuiz', descKey: 'setup.capitalQuizDesc', icon: (a, c) => <LinkIcon size={22} color={a ? c.goldBright : c.textTertiary} strokeWidth={a ? 2 : 1.5} /> },
];

const DIFFICULTIES: { key: QuizDifficulty; labelKey: string }[] = [
  { key: 'easy', labelKey: 'common.easy' },
  { key: 'medium', labelKey: 'common.medium' },
  { key: 'hard', labelKey: 'common.hard' },
];



export default function GameSetupScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onNavigate = useNavTabs();
  const initialMode = route.params?.initialMode;
  const initialDifficulty = route.params?.initialDifficulty;

  const [displayMode, setDisplayMode] = useState<DisplayMode>('flag');
  const [setupMode, setSetupMode] = useState<SetupMode>(() => {
    switch (initialMode) {
      case 'easy': case 'medium': case 'hard': return 'quiz';
      case 'flagpuzzle': return 'flagpuzzle';
      case 'flashflag': return 'flashflag';
      case 'timeattack': return 'timeattack';
      case 'neighbors': return 'neighbors';
      case 'capitalconnection': return 'capitalconnection';
      default: return 'quiz';
    }
  });
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(() => {
    if (initialDifficulty) return initialDifficulty;
    switch (initialMode) {
      case 'easy': return 'easy';
      case 'hard': return 'hard';
      default: return 'medium';
    }
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);
  const [timeLimit, setTimeLimit] = useState(60);
  const [filterType, setFilterType] = useState<CategoryType | null>(null);
  const [guessLimit, setGuessLimit] = useState(DEFAULT_GUESS_LIMIT);
  const [autocomplete, setAutocomplete] = useState(false);

  const totalFlags = getTotalFlagCount();
  const isFlashFlag = setupMode === 'flashflag';
  const isFlagPuzzle = setupMode === 'flagpuzzle';
  const isTimeAttack = setupMode === 'timeattack';
  const hasTimeLimit = isFlashFlag || isFlagPuzzle || isTimeAttack;
  const isQuiz = setupMode === 'quiz';

  // Resolve the actual GameMode from setup selections
  const resolvedMode: GameMode = isQuiz ? difficulty : (setupMode as GameMode);

  const showGuessLimit = setupMode !== 'timeattack' && setupMode !== 'flagpuzzle' && setupMode !== 'flashflag';
  const isCapitalConnection = setupMode === 'capitalconnection';
  const showDifficulty = isQuiz || isTimeAttack || isCapitalConnection;
  const showMapToggle = isQuiz;

  // Set sensible defaults when mode changes
  useEffect(() => {
    if (setupMode === 'flashflag') {
      setTimeLimit(60);
      setDisplayMode('flag');
    } else if (setupMode === 'flagpuzzle') {
      setTimeLimit(15);
      setDisplayMode('flag');
    } else if (setupMode === 'timeattack') {
      setTimeLimit(60);
      setDisplayMode('flag');
    } else if (setupMode === 'neighbors' || setupMode === 'capitalconnection') {
      setDisplayMode('flag');
    }
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
      questionCount: (isTimeAttack || isFlashFlag) ? UNLIMITED_QUESTIONS : effectiveQuestionCount,
      ...(showMapToggle && { displayMode }),
      ...(hasTimeLimit && { timeLimit }),
      ...(difficulty === 'hard' && isQuiz && { autocomplete }),
      ...(showGuessLimit && guessLimit > 0 && { guessLimit }),
      ...((isTimeAttack || isCapitalConnection) && { difficulty }),
    };

    if (isTimeAttack) {
      navigation.navigate('Game', { config });
    } else if (isFlashFlag) {
      navigation.navigate('FlashFlag', { config });
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
    return TIMEATTACK_TIMES; // Used for both Flash Flag and Timed Quiz
  };

  const showQuestionCount = !isTimeAttack && !isFlagPuzzle && !isFlashFlag && filterType !== 'theme';

  const modeLabel = t(SETUP_MODES.find((m) => m.key === setupMode)?.labelKey ?? 'setup.quiz');
  const startButtonColor = showDifficulty
    ? difficulty === 'easy' ? colors.diffEasy
      : difficulty === 'hard' ? colors.diffHard
      : colors.diffMedium
    : undefined;
  const startButtonLabel = isQuiz
    ? t('setup.startQuiz')
    : t('setup.startMode', { mode: modeLabel });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
        {/* Screen title */}
        <Text style={styles.screenTitle}>{t('setup.chooseYourGame')}</Text>

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
                  {m.icon(isActive, colors)}
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

        {/* Difficulty hero section */}
        {showDifficulty && (
          <View style={styles.diffSection}>
            <Text style={styles.diffLabel}>{t('home.difficulty')}</Text>
            <View style={styles.diffGrid}>
              {DIFFICULTIES.map((d) => {
                const isActive = difficulty === d.key;
                const diffColor = d.key === 'easy' ? colors.diffEasy
                  : d.key === 'hard' ? colors.diffHard
                  : colors.diffMedium;
                const diffBg = d.key === 'easy' ? colors.diffEasyBg
                  : d.key === 'hard' ? colors.diffHardBg
                  : colors.diffMediumBg;
                const diffBorder = d.key === 'easy' ? colors.diffEasyBorder
                  : d.key === 'hard' ? colors.diffHardBorder
                  : colors.diffMediumBorder;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[
                      styles.diffBtn,
                      isActive && { backgroundColor: diffBg, borderColor: diffBorder },
                    ]}
                    onPress={() => { hapticTap(); setDifficulty(d.key); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t(d.labelKey)}
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={[
                      styles.diffBtnText,
                      isActive && { color: diffColor },
                    ]}>{t(d.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Options card */}
        {!showDifficulty && <View style={styles.configCardSpacing} />}
        <ConfigCard>

          {/* Autocomplete (only for Hard quiz - first row, no divider above) */}
          {isQuiz && difficulty === 'hard' && (
            <ConfigRow label={t('home.hints')}>
              <SegBtn label={t('common.off')} active={!autocomplete} onPress={() => setAutocomplete(false)} accessibilityLabel={`${t('home.hints')}: ${t('common.off')}`} />
              <SegBtn label={t('common.on')} active={autocomplete} onPress={() => setAutocomplete(true)} accessibilityLabel={`${t('home.hints')}: ${t('common.on')}`} />
            </ConfigRow>
          )}

          {/* Display Mode (flag or map) */}
          {showMapToggle && (
            <ConfigRow label={t('setup.display')}>
              <SegBtn label={t('setup.displayFlag')} active={displayMode === 'flag'} onPress={() => setDisplayMode('flag')} accessibilityLabel={`${t('setup.display')}: ${t('setup.displayFlag')}`} />
              <SegBtn label={t('setup.displayMap')} active={displayMode === 'map'} onPress={() => setDisplayMode('map')} accessibilityLabel={`${t('setup.display')}: ${t('setup.displayMap')}`} />
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
                  accessibilityLabel={v === 0 ? `${t('setup.lives')}: ${t('setup.unlimited')}` : `${t('setup.lives')}: ${v}`}
                />
              ))}
            </ConfigRow>
          )}

          {/* Time Limit (only for Flash Flag/FlagPuzzle/TimeAttack) */}
          {hasTimeLimit && (
            <ConfigRow label={t('setup.timeLimit')}>
              {getTimeLimitOptions().map((seconds) => (
                <SegBtn
                  key={seconds}
                  label={t('setup.timeSuffix', { t: seconds })}
                  active={timeLimit === seconds}
                  onPress={() => setTimeLimit(seconds)}
                  accessibilityLabel={t('a11y.timeLimitSeconds', { label: t('setup.timeLimit'), seconds })}
                />
              ))}
            </ConfigRow>
          )}

          {/* Question Count (for FlagPuzzle within time modes) */}
          {hasTimeLimit && isFlagPuzzle && (
            <ConfigRow label={t('setup.questions')}>
              {SETUP_QUESTION_COUNTS.map((count) => (
                <SegBtn
                  key={count}
                  label={String(count)}
                  active={!questionCountAll && questionCount === count}
                  onPress={() => { setQuestionCount(count); setQuestionCountAll(false); }}
                  accessibilityLabel={t('common.nQuestions', { n: count })}
                />
              ))}
              <SegBtn
                label={t('common.all')}
                active={questionCountAll}
                onPress={() => setQuestionCountAll(true)}
                accessibilityLabel={t('common.allQuestions')}
              />
            </ConfigRow>
          )}

          {/* Question Count (everything except Flash Flag/TimeAttack/FlagPuzzle) */}
          {showQuestionCount && (
            <ConfigRow label={t('setup.questions')}>
              {SETUP_QUESTION_COUNTS.map((count) => (
                <SegBtn
                  key={count}
                  label={String(count)}
                  active={!questionCountAll && questionCount === count}
                  onPress={() => { setQuestionCount(count); setQuestionCountAll(false); }}
                  accessibilityLabel={t('common.nQuestions', { n: count })}
                />
              ))}
              <SegBtn
                label={t('common.all')}
                active={questionCountAll}
                onPress={() => setQuestionCountAll(true)}
                accessibilityLabel={t('common.allQuestions')}
              />
            </ConfigRow>
          )}
        </ConfigCard>

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
                accessibilityLabel={type === 'region' ? t('setup.byRegion') : t('setup.byTheme')}
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.filterTypeText, isActive && styles.filterTypeTextActive]}>
                  {type === 'region' ? t('setup.byRegion') : t('setup.byTheme')}
                </Text>
                <View style={isActive ? styles.chevronDown : undefined}>
                  <ChevronRightIcon
                    size={14}
                    color={isActive ? colors.playText : colors.textTertiary}
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
        </ScreenContainer>
      </ScrollView>

      {/* Pinned start button */}
      <View style={styles.startButtonWrap}>
        <ScreenContainer>
          <TouchableOpacity
            style={[
              styles.startButton,
              startButtonColor != null && { backgroundColor: startButtonColor },
            ]}
            onPress={startGame}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={startButtonLabel}
          >
            <Text style={styles.startButtonText}>{startButtonLabel}</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </View>

      <BottomNav activeTab="Modes" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => {
  const btn = buildButtons(colors);
  return StyleSheet.create({
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
  },

  // Screen title - prominent heading for the page
  screenTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Spacing for options card when difficulty section is hidden
  configCardSpacing: {
    marginTop: spacing.lg,
  },

  // Difficulty hero section
  diffSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  diffLabel: {
    ...typography.eyebrow,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  diffGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  diffBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    letterSpacing: -0.1,
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
    borderColor: colors.goldAlpha50,
    backgroundColor: colors.goldAlpha10,
  },
  modeIconBadge: {
    width: 42,
    height: 42,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  modeIconBadgeActive: {
    backgroundColor: colors.goldAlpha15,
  },
  modeLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  modeLabelActive: {
    color: colors.goldBright,
  },
  modeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  modeDescActive: {
    color: colors.textTertiary,
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
    borderColor: colors.goldBright,
    backgroundColor: colors.goldBright,
  },
  filterTypeText: {
    ...typography.label,
    color: colors.text,
  },
  filterTypeTextActive: {
    color: colors.playText,
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
    borderColor: colors.goldBright,
    backgroundColor: colors.goldBright,
  },
  categoryTextGroup: {
    gap: 1,
  },
  categoryLabel: {
    ...typography.label,
    color: colors.text,
  },
  categoryLabelActive: {
    color: colors.playText,
  },
  categoryCount: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: fontSize.xs,
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
    ...btn.primary,
  },
  startButtonText: {
    ...btn.primaryText,
  },
}); };
