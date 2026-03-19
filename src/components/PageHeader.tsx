import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { spacing, typography } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export default function PageHeader({ title, subtitle, style }: PageHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">{title}</Text>
      {subtitle != null && (
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.caption,
  },
});
