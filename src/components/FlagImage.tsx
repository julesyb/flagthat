import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../utils/theme';

interface FlagImageProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
  emoji?: string;
  style?: object;
}

const SIZE_MAP = {
  small: { width: 48, height: 32 },
  medium: { width: 80, height: 54 },
  large: { width: 160, height: 107 },
  hero: { width: 280, height: 187 },
};

function getFlagUrl(code: string, width: number): string {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

export default function FlagImage({ countryCode, size = 'large', emoji, style }: FlagImageProps) {
  const dimensions = SIZE_MAP[size];
  const requestWidth = Math.min(dimensions.width * 2, 640);
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.container, dimensions, style]}>
      {/* Emoji fallback shown until image loads */}
      {!loaded && emoji && (
        <View style={[styles.emojiOverlay, dimensions]}>
          <Text style={[styles.emojiText, { fontSize: dimensions.height * 0.6 }]}>{emoji}</Text>
        </View>
      )}
      <Image
        source={{ uri: getFlagUrl(countryCode, requestWidth) }}
        style={[styles.image, dimensions]}
        contentFit="cover"
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
        <View style={[styles.emojiOverlay, { width: 48, height: 32 }]}>
          <Text style={styles.smallEmojiText}>{emoji}</Text>
        </View>
      )}
      <Image
        source={{ uri: getFlagUrl(countryCode, 80) }}
        style={styles.smallImage}
        contentFit="cover"
        transition={150}
        onLoad={() => setLoaded(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  image: {
    borderRadius: 6,
  },
  emojiOverlay: {
    position: 'absolute',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  emojiText: {
    textAlign: 'center',
  },
  smallContainer: {
    width: 48,
    height: 32,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  smallImage: {
    width: 48,
    height: 32,
    borderRadius: 4,
  },
  smallEmojiText: {
    fontSize: 18,
    textAlign: 'center',
  },
});
