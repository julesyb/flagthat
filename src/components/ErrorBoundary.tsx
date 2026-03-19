import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, typography, borderRadius, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryInner extends Component<Props & { colors: ThemeColors }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error logging handled by external service if needed
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const styles = createStyles(this.props.colors);
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{t('error.title')}</Text>
          <Text style={styles.subtitle}>
            {t('error.message')}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('error.tryAgain')}
          >
            <Text style={styles.buttonText}>{t('error.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({ children }: Props) {
  const { colors } = useTheme();
  return <ErrorBoundaryInner colors={colors}>{children}</ErrorBoundaryInner>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.goldBright,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.playText,
  },
});
