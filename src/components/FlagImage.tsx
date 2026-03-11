import React, { useState } from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily } from '../utils/theme';

interface FlagImageProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
  emoji?: string;
  style?: object;
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

export default function FlagImage({ countryCode, size = 'large', emoji, style }: FlagImageProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [loaded, setLoaded] = useState(false);

  if (size === 'hero') {
    // Hero fills parent width — use aspectRatio instead of fixed pixels
    const requestWidth = Math.min(screenWidth, 500) * 2;
    return (
      <View style={[styles.container, { width: '100%', aspectRatio: 3 / 2 }, style]}>
        {!loaded && (
          <View style={[styles.emojiOverlay, { width: '100%', height: '100%' }]}>
            <Text style={styles.placeholderText}>{countryCode.toUpperCase()}</Text>
          </View>
        )}
        <Image
          source={{ uri: getFlagUrl(countryCode, requestWidth) }}
          style={[styles.image, { width: '100%', height: '100%' }]}
          contentFit="contain"
          transition={200}
          priority="high"
          cachePolicy="memory-disk"
          onLoad={() => setLoaded(true)}
        />
      </View>
    );
  }

  const dimensions = SIZE_MAP[size];
  const requestWidth = dimensions.width * 2;

  return (
    <View style={[styles.container, dimensions, style]}>
      {!loaded && (
        <View style={[styles.emojiOverlay, dimensions]}>
          <Text style={styles.placeholderText}>{countryCode.toUpperCase()}</Text>
        </View>
      )}
      <Image
        source={{ uri: getFlagUrl(countryCode, requestWidth) }}
        style={[styles.image, dimensions]}
        contentFit="contain"
        transition={200}
        onLoad={() => setLoaded(true)}
      />
    </View>
  );
}

export function FlagImageSmall({ countryCode, emoji }: { countryCode: string; emoji: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={styles.smallContainer}>
      {!loaded && (
        <View style={[styles.emojiOverlay, { width: 56, height: 37 }]}>
          <Text style={styles.placeholderText}>{countryCode.toUpperCase()}</Text>
        </View>
      )}
      <Image
        source={{ uri: getFlagUrl(countryCode, 112) }}
        style={styles.smallImage}
        contentFit="contain"
        transition={150}
        onLoad={() => setLoaded(true)}
      />
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
  emojiOverlay: {
    position: 'absolute',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  placeholderText: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 12,
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
