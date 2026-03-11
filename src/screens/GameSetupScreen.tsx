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
import { colors, spacing, typography, fontFamily, buttons, borderRadius } from '../utils/theme';
import {
  GameMode,
  DisplayMode,
  CategoryId,
  CategoryType,
  CATEGORIES,
  CATEGORY_TYPE_LABELS,
  GameConfig,
} from '../types';
import { getCategoryCount, getTotalFlagCount } from '../data';
import { RootStackParamList } from '../types/navigation';
import BottomNav from '../components/BottomNav';

type Props = NativeStackScreenProps<RootStackParamList, 'GameSetup'>;

const QUESTION_COUNTS = [10, 20, 50, 100];
const FLAGPUZZLE_TIMES = [15, 30, 60];
const TIMEATTACK_TIMES = [30, 60, 90, 120];
const DEFAULT_GUESS_LIMIT = 3;
const GUESS_LIMIT_OPTIONS = [3, 5, 0] as const; // 0 = unlimited

// Extracted: reusable row of option chips with "All" toggle
function OptionChipRow({
  options,
  selected,
  onSelect,
  includeAll,
  allSelected,
  onSelectAll,
  suffix,
}: {
  options: number[];
  selected: number;
  onSelect: (v: number) => void;
  includeAll?: boolean;
  allSelected?: boolean;
  onSelectAll?: () => void;
  suffix?: string;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((v) => {
        const isActive = !allSelected && selected === v;
        return (
          <TouchableOpacity
            key={v}
            style={[styles.optionChip, isActive && styles.optionChipActive]}
            onPress={() => onSelect(v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
              {v}{suffix ?? ''}
            </Text>
          </TouchableOpacity>
        );
      })}
      {includeAll && onSelectAll && (
        <TouchableOpacity
          style={[styles.optionChip, allSelected && styles.optionChipActive]}
          onPress={onSelectAll}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: !!allSelected }}
        >
          <Text style={[styles.optionLabel, allSelected && styles.optionLabelActive]}>
            All
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

type SetupMode = 'quiz' | 'flagflash' | 'flagpuzzle' | 'timeattack' | 'neighbors' | 'capitalconnection';
type QuizDifficulty = 'easy' | 'medium' | 'hard';

const SETUP_MODES: { key: SetupMode; label: string; description: string; icon: string }[] = [
  { key: 'quiz', label: 'Quiz', description: 'Classic flag quiz', icon: 'Q' },
  { key: 'flagflash', label: 'FlagFlash', description: 'Party mode, tilt to play', icon: '!!' },
  { key: 'flagpuzzle', label: 'Flag Puzzle', description: 'Flag reveals over time', icon: '??' },
  { key: 'timeattack', label: 'Timed Quiz', description: 'Race the clock', icon: '00' },
  { key: 'neighbors', label: 'Neighbors', description: 'Find bordering countries', icon: 'NB' },
  { key: 'capitalconnection', label: 'Capital Quiz', description: 'Match flags to capitals', icon: 'CC' },
];

const DIFFICULTIES: { key: QuizDifficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

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
    if (isFlagFlash) setTimeLimit(60);
    else if (isFlagPuzzle) setTimeLimit(15);
    else if (isTimeAttack) setTimeLimit(60);
  }, [setupMode]);

  const handleFilterTypeSelect = (type: CategoryType) => {
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
    setSelectedCategory(selectedCategory === catId ? 'all' : catId);
  };

  const startGame = () => {
    const effectiveQuestionCount = questionCountAll
      ? getCategoryCount(selectedCategory)
      : questionCount;

    const config: GameConfig = {
      mode: resolvedMode,
      category: selectedCategory,
      questionCount: isTimeAttack ? 999 : effectiveQuestionCount,
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Game Mode */}
        <Text style={styles.sectionTitle}>Game Mode</Text>
        <View style={styles.modeGrid}>
          {SETUP_MODES.map((m) => {
            const isActive = setupMode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeCard, isActive && styles.modeCardActive]}
                onPress={() => setSetupMode(m.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${m.label}: ${m.description}`}
              >
                <View style={[styles.modeIconBadge, isActive && styles.modeIconBadgeActive]}>
                  <Text style={[styles.modeIconText, isActive && styles.modeIconTextActive]}>{m.icon}</Text>
                </View>
                <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                  {m.label}
                </Text>
                <Text style={[styles.modeDesc, isActive && styles.modeDescActive]}>
                  {m.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Difficulty (only for Quiz mode) */}
        {isQuiz && (
          <>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.optionRow}>
              {DIFFICULTIES.map((d) => {
                const isActive = difficulty === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.optionChip, isActive && styles.optionChipActive]}
                    onPress={() => setDifficulty(d.key)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Autocomplete (only for Hard quiz) */}
        {isQuiz && difficulty === 'hard' && (
          <>
            <Text style={styles.sectionTitle}>Hints</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.optionChip, !autocomplete && styles.optionChipActive]}
                onPress={() => setAutocomplete(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionLabel, !autocomplete && styles.optionLabelActive]}>Off</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionChip, autocomplete && styles.optionChipActive]}
                onPress={() => setAutocomplete(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionLabel, autocomplete && styles.optionLabelActive]}>On</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Display Mode (flag or map) */}
        {showMapToggle && (
          <>
            <Text style={styles.sectionTitle}>Display</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.optionChip, displayMode === 'flag' && styles.optionChipActive]}
                onPress={() => setDisplayMode('flag')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: displayMode === 'flag' }}
              >
                <Text style={[styles.optionLabel, displayMode === 'flag' && styles.optionLabelActive]}>Flag</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionChip, displayMode === 'map' && styles.optionChipActive]}
                onPress={() => setDisplayMode('map')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: displayMode === 'map' }}
              >
                <Text style={[styles.optionLabel, displayMode === 'map' && styles.optionLabelActive]}>Map</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Guess Limit (only for standard quiz modes) */}
        {showGuessLimit && (
          <>
            <Text style={styles.sectionTitle}>Lives</Text>
            <Text style={styles.filterHint}>Wrong guesses before game over</Text>
            <View style={styles.optionRow}>
              {GUESS_LIMIT_OPTIONS.map((v) => {
                const isActive = guessLimit === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.optionChip, isActive && styles.optionChipActive]}
                    onPress={() => setGuessLimit(v)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                      {v === 0 ? 'Unlimited' : v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Filter */}
        <Text style={styles.sectionTitle}>Filter</Text>
        <Text style={styles.filterHint}>Optional - default is all {totalFlags} flags</Text>

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
                  {CATEGORY_TYPE_LABELS[type]}
                </Text>
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
                  accessibilityLabel={`${cat.label}, ${count} flags`}
                >
                  <View style={[styles.categoryIconBadge, isActive && styles.categoryIconBadgeActive]}>
                    <Text style={[styles.categoryIconText, isActive && styles.categoryIconTextActive]}>{cat.icon}</Text>
                  </View>
                  <View style={styles.categoryTextGroup}>
                    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                      {cat.label}
                    </Text>
                    <Text style={[styles.categoryCount, isActive && styles.categoryCountActive]}>
                      {count} flags
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Time Limit (only for FlagFlash/FlagPuzzle) */}
        {hasTimeLimit && (
          <>
            <Text style={styles.sectionTitle}>Time Limit</Text>
            <View style={styles.optionRow}>
              {getTimeLimitOptions().map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.optionChip,
                    timeLimit === t && styles.optionChipActive,
                  ]}
                  onPress={() => setTimeLimit(t)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      timeLimit === t && styles.optionLabelActive,
                    ]}
                  >
                    {t}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {isFlagPuzzle && (
              <>
                <Text style={styles.sectionTitle}>Questions</Text>
                <View style={styles.optionRow}>
                  {QUESTION_COUNTS.map((count) => (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.optionChip,
                        !questionCountAll && questionCount === count && styles.optionChipActive,
                      ]}
                      onPress={() => { setQuestionCount(count); setQuestionCountAll(false); }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          !questionCountAll && questionCount === count && styles.optionLabelActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.optionChip,
                      questionCountAll && styles.optionChipActive,
                    ]}
                    onPress={() => setQuestionCountAll(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        questionCountAll && styles.optionLabelActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* Question Count (everything except FlagFlash) */}
        {showQuestionCount && (
          <>
            <Text style={styles.sectionTitle}>Questions</Text>
            <OptionChipRow
              options={QUESTION_COUNTS}
              selected={questionCount}
              onSelect={(v) => { setQuestionCount(v); setQuestionCountAll(false); }}
              includeAll
              allSelected={questionCountAll}
              onSelectAll={() => setQuestionCountAll(true)}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.startButton}
          onPress={startGame}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Start ${isQuiz ? DIFFICULTIES.find((d) => d.key === difficulty)?.label + ' Quiz' : SETUP_MODES.find((m) => m.key === setupMode)?.label}`}
        >
          <Text style={styles.startButtonText}>
            Start {isQuiz ? `${DIFFICULTIES.find((d) => d.key === difficulty)?.label} Quiz` : SETUP_MODES.find((m) => m.key === setupMode)?.label}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.headingUpper,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  filterHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
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
    backgroundColor: colors.surfaceSecondary,
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
    backgroundColor: colors.ink,
  },
  modeIconText: {
    fontSize: 16,
    fontFamily: fontFamily.uiLabel,
    color: colors.textSecondary,
  },
  modeIconTextActive: {
    color: colors.white,
  },
  modeLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  modeLabelActive: {
    color: colors.ink,
  },
  modeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  modeDescActive: {
    color: colors.slate,
  },
  filterTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTypeChip: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  filterTypeChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.surfaceSecondary,
  },
  filterTypeText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  filterTypeTextActive: {
    color: colors.ink,
  },
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
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  categoryChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.surfaceSecondary,
  },
  categoryIconBadge: {
    width: 32,
    height: 32,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  categoryIconBadgeActive: {
    backgroundColor: colors.ink,
  },
  categoryIconText: {
    fontSize: 11,
    fontFamily: fontFamily.uiLabel,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  categoryIconTextActive: {
    color: colors.white,
  },
  categoryTextGroup: {
    gap: 1,
  },
  categoryLabel: {
    ...typography.label,
    color: colors.text,
  },
  categoryLabelActive: {
    color: colors.ink,
  },
  categoryCount: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
  },
  categoryCountActive: {
    color: colors.slate,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionChip: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  optionChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.surfaceSecondary,
  },
  optionLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  optionLabelActive: {
    color: colors.ink,
  },
  startButton: {
    ...buttons.primary,
    marginTop: spacing.xl,
  },
  startButtonText: {
    ...buttons.primaryText,
  },
});
