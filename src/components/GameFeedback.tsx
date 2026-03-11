import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../utils/theme';
import { t } from '../utils/i18n';

interface GameFeedbackProps {
  correct: boolean;
  correctAnswer: string;
  children?: React.ReactNode;
}

export default function GameFeedback({ correct, correctAnswer, children }: GameFeedbackProps) {
  return (
    <View style={styles.container}>
      {correct ? (
        <Text style={styles.correct} accessibilityLiveRegion="polite">{t('common.correct')}</Text>
      ) : (
        <Text style={styles.wrong} accessibilityLiveRegion="polite">{correctAnswer}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  correct: {
    ...typography.heading,
    color: colors.success,
  },
  wrong: {
    ...typography.heading,
    color: colors.error,
  },
});
