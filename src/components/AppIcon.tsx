import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily, fontSize, spacing, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';

interface AppIconProps {
  size?: number;
  variant?: 'dark' | 'light';
}

/**
 * Brand app icon component — renders the "Flag That" logotype
 * in a square container matching the app icon design.
 *
 * Usage: <AppIcon size={120} variant="dark" />
 */
export default function AppIcon({ size = 120, variant = 'dark' }: AppIconProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDark = variant === 'dark';
  const scale = size / 120;
  const textColor = isDark ? colors.white : colors.ink;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: isDark ? colors.ink : colors.background,
        },
      ]}
    >
      {/* Accent bar */}
      <View
        style={[
          styles.accentBar,
          {
            left: size * 0.08,
            top: size * 0.12,
            width: size * 0.025,
            height: size * 0.76,
          },
        ]}
      />

      <View style={[styles.textContainer, { paddingLeft: size * 0.16, paddingTop: size * 0.22 }]}>
        <Text
          style={[
            styles.flagText,
            {
              fontSize: fontSize.title * scale,
              lineHeight: 36 * scale,
              color: textColor,
            },
          ]}
        >
          Flag
        </Text>
        <View
          style={[
            styles.rule,
            {
              backgroundColor: isDark ? colors.whiteAlpha15 : colors.inkAlpha10,
              height: Math.max(1, 2 * scale),
              marginTop: spacing.xxs * scale,
              marginBottom: spacing.xxs * scale,
            },
          ]}
        />
        <Text
          style={[
            styles.thatText,
            {
              fontSize: fontSize.title * scale,
              lineHeight: 36 * scale,
            },
          ]}
        >
          That
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    backgroundColor: colors.accent,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  flagText: {
    fontFamily: fontFamily.display,
    letterSpacing: -0.5,
  },
  rule: {
    alignSelf: 'flex-start',
    width: '60%',
  },
  thatText: {
    fontFamily: fontFamily.displayItalic,
    color: colors.accent,
    letterSpacing: -0.5,
  },
});

