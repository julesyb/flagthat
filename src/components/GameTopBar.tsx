import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, nav } from '../utils/theme';

interface GameTopBarProps {
  currentIndex: number;
  totalQuestions: number;
  correctCount: number;
  currentStreak: number;
  streakScale: Animated.Value;
  onExit: () => void;
  rightElement?: React.ReactNode;
}

export default function GameTopBar({
  currentIndex,
  totalQuestions,
  correctCount,
  currentStreak,
  streakScale,
  onExit,
  rightElement,
}: GameTopBarProps) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={onExit}
        style={styles.exitButton}
        accessibilityRole="button"
        accessibilityLabel="Exit game"
      >
        <Text style={styles.exitText}>Exit</Text>
      </TouchableOpacity>
      <View style={styles.centerInfo}>
        <Text style={styles.counter}>
          {currentIndex + 1} / {totalQuestions}
        </Text>
        {currentStreak >= 2 ? (
          <Animated.Text
            style={[styles.streakText, { transform: [{ scale: streakScale }] }]}
          >
            {currentStreak}x streak
          </Animated.Text>
        ) : (
          <Text style={styles.score}>
            {correctCount} correct
          </Text>
        )}
      </View>
      {rightElement ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: {
    ...nav.backButton,
  },
  exitText: {
    ...nav.backText,
  },
  centerInfo: {
    alignItems: 'center',
  },
  counter: {
    ...typography.bodyBold,
    color: colors.text,
  },
  streakText: {
    ...typography.caption,
    color: colors.accent,
  },
  score: {
    ...typography.caption,
    color: colors.success,
  },
  spacer: {
    width: 60,
  },
});
