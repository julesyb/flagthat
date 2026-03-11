import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, borderRadius } from '../utils/theme';

interface FlagImageProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
  emoji?: string;
  style?: object;
  accessibilityLabel?: string;
}

const SIZE_MAP = {
  small: { width: 64, height: 43 },
  medium: { width: 120, height: 80 },
  large: { width: 240, height: 160 },
};

// flagcdn.com serves PNGs at these fixed widths
const CDN_WIDTHS = [20, 40, 80, 160, 320, 640, 1280, 2560];

function nearestCdnWidth(desired: number): number {
  return CDN_WIDTHS.find((w) => w >= desired) ?? 2560;
}

function getFlagUrl(code: string, width: number): string {
  return `https://flagcdn.com/w${nearestCdnWidth(width)}/${code.toLowerCase()}.png`;
}

export default function FlagImage({ countryCode, size = 'large', style, accessibilityLabel }: FlagImageProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const a11yLabel = accessibilityLabel || `Flag of ${countryCode.toUpperCase()}`;

  if (size === 'hero') {
    // Hero fills parent width — use aspectRatio instead of fixed pixels
    const requestWidth = Math.min(screenWidth, 500) * 2;
    return (
      <View
        style={[styles.container, { width: '100%', aspectRatio: 3 / 2 }, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={a11yLabel}
      >
        {!loaded && (
          <View style={[styles.placeholder, { width: '100%', height: '100%' }]}>
            {error ? (
              <Text style={styles.errorText}>{countryCode.toUpperCase()}</Text>
            ) : (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            )}
          </View>
        )}
        {!error && (
          <Image
            source={{ uri: getFlagUrl(countryCode, requestWidth) }}
            style={[styles.image, { width: '100%', height: '100%' }]}
            contentFit="contain"
            transition={200}
            priority="high"
            cachePolicy="memory-disk"
            onLoad={() => setLoaded(true)}
            onError={() => { setError(true); setLoaded(false); }}
          />
        )}
      </View>
    );
  }

  const dimensions = SIZE_MAP[size];
  const requestWidth = dimensions.width * 2;

  return (
    <View
      style={[styles.container, dimensions, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      {!loaded && (
        <View style={[styles.placeholder, dimensions]}>
          {error ? (
            <Text style={styles.errorText}>{countryCode.toUpperCase()}</Text>
          ) : (
            <ActivityIndicator size="small" color={colors.textTertiary} />
          )}
        </View>
      )}
      {!error && (
        <Image
          source={{ uri: getFlagUrl(countryCode, requestWidth) }}
          style={[styles.image, dimensions]}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(false); }}
        />
      )}
    </View>
  );
}

export function FlagImageSmall({ countryCode, emoji }: { countryCode: string; emoji: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <View
      style={styles.smallContainer}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Flag of ${countryCode.toUpperCase()}`}
    >
      {!loaded && (
        <View style={[styles.placeholder, { width: 56, height: 37 }]}>
          {error ? (
            <Text style={[styles.errorText, { fontSize: fontSize.xxs }]}>{countryCode.toUpperCase()}</Text>
          ) : (
            <ActivityIndicator size="small" color={colors.textTertiary} />
          )}
        </View>
      )}
      {!error && (
        <Image
          source={{ uri: getFlagUrl(countryCode, 112) }}
          style={styles.smallImage}
          contentFit="contain"
          transition={150}
          cachePolicy="memory-disk"
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(false); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  image: {
    backgroundColor: 'transparent',
  },
  placeholder: {
    position: 'absolute',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
  },
  errorText: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  smallContainer: {
    width: 56,
    height: 37,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.rule2,
  },
  smallImage: {
    width: 56,
    height: 37,
    backgroundColor: 'transparent',
  },
});
