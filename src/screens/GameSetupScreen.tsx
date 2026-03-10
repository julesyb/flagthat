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
import { colors, spacing, borderRadius, typography, shadows } from '../utils/theme';
import { FlagCategory, Difficulty, CATEGORY_LABELS, DIFFICULTY_CONFIG, GameConfig } from '../types';
import { getCategoryCount } from '../data';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'GameSetup'>;

const QUESTION_COUNTS = [10, 20, 30, 50];

export default function GameSetupScreen({ navigation }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [selectedCategories, setSelectedCategories] = useState<FlagCategory[]>(['countries']);
  const [questionCount, setQuestionCount] = useState(10);

  const allCategories = Object.keys(CATEGORY_LABELS) as FlagCategory[];

  const toggleCategory = (cat: FlagCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // Must have at least one
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const startGame = () => {
    const config: GameConfig = {
      difficulty,
      categories: selectedCategories,
      questionCount,
    };
    navigation.navigate('Game', { config });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Difficulty</Text>
        <View style={styles.difficultyRow}>
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.difficultyCard,
                difficulty === d && styles.difficultyCardActive,
              ]}
              onPress={() => setDifficulty(d)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.difficultyLabel,
                  difficulty === d && styles.difficultyLabelActive,
                ]}
              >
                {DIFFICULTY_CONFIG[d].label}
              </Text>
              <Text
                style={[
                  styles.difficultyDesc,
                  difficulty === d && styles.difficultyDescActive,
                ]}
              >
                {DIFFICULTY_CONFIG[d].description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {allCategories.map((cat) => {
            const count = getCategoryCount(cat);
            const isSelected = selectedCategories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelActive,
                  ]}
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
                <Text
                  style={[
                    styles.categoryCount,
                    isSelected && styles.categoryCountActive,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Questions</Text>
        <View style={styles.questionRow}>
          {QUESTION_COUNTS.map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.questionChip,
                questionCount === count && styles.questionChipActive,
              ]}
              onPress={() => setQuestionCount(count)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.questionLabel,
                  questionCount === count && styles.questionLabelActive,
                ]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={startGame}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Game</Text>
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
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  difficultyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.small,
  },
  difficultyCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  difficultyLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  difficultyLabelActive: {
    color: colors.accent,
  },
  difficultyDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  difficultyDescActive: {
    color: colors.accent,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  categoryLabel: {
    ...typography.label,
    color: colors.text,
  },
  categoryLabelActive: {
    color: colors.accent,
  },
  categoryCount: {
    ...typography.captionBold,
    color: colors.textTertiary,
  },
  categoryCountActive: {
    color: colors.accent,
  },
  questionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  questionChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  questionChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  questionLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  questionLabelActive: {
    color: colors.accent,
  },
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.medium,
  },
  startButtonText: {
    ...typography.heading,
    color: colors.white,
  },
});
