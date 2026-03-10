import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily } from '../utils/theme';
import {
  GameMode,
  CategoryId,
  CategoryType,
  GAME_MODES,
  CATEGORIES,
  CATEGORY_TYPE_LABELS,
  GameConfig,
} from '../types';
import { getCategoryCount, getTotalFlagCount } from '../data';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'GameSetup'>;

const QUESTION_COUNTS = [10, 20, 50, 100];
const HEADSUP_TIMES = [15, 30, 60, 90];

export default function GameSetupScreen({ navigation }: Props) {
  const [mode, setMode] = useState<GameMode>('easy');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);
  const [timeLimit, setTimeLimit] = useState(60);
  const [filterType, setFilterType] = useState<CategoryType | null>(null);

  const totalFlags = getTotalFlagCount();
  const isHeadsUp = mode === 'headsup';

  const handleFilterTypeSelect = (type: CategoryType) => {
    if (filterType === type) {
      // Deselect filter type, reset to all
      setFilterType(null);
      setSelectedCategory('all');
    } else {
      setFilterType(type);
      setSelectedCategory('all');
    }
  };

  const handleCategorySelect = (catId: CategoryId) => {
    if (selectedCategory === catId) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(catId);
    }
  };

  const startGame = () => {
    const effectiveQuestionCount = questionCountAll
      ? getCategoryCount(selectedCategory)
      : questionCount;

    const config: GameConfig = {
      mode,
      category: selectedCategory,
      questionCount: isHeadsUp ? 999 : effectiveQuestionCount,
      ...(isHeadsUp && { timeLimit }),
    };

    if (isHeadsUp) {
      navigation.navigate('HeadsUp', { config });
    } else {
      navigation.navigate('Game', { config });
    }
  };

  const filteredCategories = filterType
    ? CATEGORIES.filter((c) => c.type === filterType)
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Game Mode</Text>
        <View style={styles.modeGrid}>
          {(Object.keys(GAME_MODES) as GameMode[]).map((m) => {
            const info = GAME_MODES[m];
            const isActive = mode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.modeCard, isActive && styles.modeCardActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <View style={[styles.modeIconBadge, isActive && styles.modeIconBadgeActive]}>
                  <Text style={[styles.modeIconText, isActive && styles.modeIconTextActive]}>{info.icon}</Text>
                </View>
                <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                  {info.label}
                </Text>
                <Text style={[styles.modeDesc, isActive && styles.modeDescActive]}>
                  {info.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Filter</Text>
        <Text style={styles.filterHint}>Optional — default is all {totalFlags} flags</Text>

        {/* Filter type selector: Region or Theme */}
        <View style={styles.filterTypeRow}>
          {(['region', 'theme'] as CategoryType[]).map((type) => {
            const isActive = filterType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.filterTypeChip, isActive && styles.filterTypeChipActive]}
                onPress={() => handleFilterTypeSelect(type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTypeText, isActive && styles.filterTypeTextActive]}>
                  {CATEGORY_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Show categories for selected filter type */}
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

        {!isHeadsUp ? (
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
        ) : (
          <>
            <Text style={styles.sectionTitle}>Time Limit</Text>
            <View style={styles.optionRow}>
              {HEADSUP_TIMES.map((t) => (
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
          </>
        )}

        <TouchableOpacity
          style={[styles.startButton, isHeadsUp && styles.startButtonParty]}
          onPress={startGame}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>
            {isHeadsUp ? 'Start Heads Up!' : 'Start Game'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderWidth: 1.5,
    borderColor: colors.border,
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
    backgroundColor: colors.ink,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  startButtonParty: {
    backgroundColor: colors.accent,
  },
  startButtonText: {
    ...typography.headingUpper,
    color: colors.white,
  },
});
