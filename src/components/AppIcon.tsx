import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';

interface AppIconProps {
  size?: number;
  variant?: 'dark' | 'light';
}

/**
 * Brand app icon component — renders "FT" inside a waving flag outline
 * on a black background.
 *
 * Usage: <AppIcon size={120} variant="dark" />
 */
export default function AppIcon({ size = 120, variant = 'dark' }: AppIconProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Flag That"
      style={[styles.container, { width: size, height: size }]}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        {/* Flag pole */}
        <Path
          d="M28 22 L28 100"
          stroke="#FFFFFF"
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* Flag shape with wind wave */}
        <Path
          d="M28 24 C42 20, 58 30, 72 26 C80 24, 88 22, 96 26 L96 28 C92 38, 94 48, 96 58 L96 60 C88 56, 80 58, 72 60 C58 64, 42 54, 28 58 Z"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeLinejoin="round"
          fill="none"
        />

        {/* F in white */}
        <SvgText
          x="48"
          y="50"
          fontSize="28"
          fontWeight="bold"
          fontFamily="Barlow-Bold, Barlow, sans-serif"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          F
        </SvgText>

        {/* T in gold/yellow */}
        <SvgText
          x="72"
          y="50"
          fontSize="28"
          fontWeight="bold"
          fontFamily="Barlow-Bold, Barlow, sans-serif"
          fill="#E9BA4C"
          textAnchor="middle"
        >
          T
        </SvgText>
      </Svg>
    </View>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: '#1A1820',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
