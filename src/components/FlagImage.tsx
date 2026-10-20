import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Pressable, useWindowDimensions, StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { fontFamily, fontSize, borderRadius, spacing, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';
import { hapticTap } from '../utils/feedback';

interface FlagImageProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
  /** When true, the image fills its parent container (use for grids/flexible layouts). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Image crossfade duration in ms. Set to 0 when parent handles fade animation. */
  transition?: number;
  /**
   * Hide the country-code text on a failed load. Use for gameplay question flags
   * where showing the code would reveal the answer; the placeholder shows a neutral
   * retry prompt instead.
   */
  hideLabel?: boolean;
}

const SIZE_MAP = {
  small: { width: 64, height: 43 },
  medium: { width: 120, height: 80 },
  large: { width: 240, height: 160 },
};

// flagcdn.com serves PNGs at these fixed widths
const CDN_WIDTHS = [20, 40, 80, 160, 320, 640, 1280, 2560];

// Number of automatic retries before falling back to a manual retry prompt.
const MAX_RETRIES = 3;

function nearestCdnWidth(desired: number): number {
  return CDN_WIDTHS.find((w) => w >= desired) ?? 2560;
}

function getFlagUrl(code: string, width: number, attempt: number): string {
  const base = `https://flagcdn.com/w${nearestCdnWidth(width)}/${code.toLowerCase()}.png`;
  // Cache-bust on retries so expo-image and the CDN re-fetch instead of replaying the failure.
  return attempt > 0 ? `${base}?retry=${attempt}` : base;
}

/**
 * Manages flag image loading with automatic backoff retries for transient
 * network failures, plus a manual retry escape hatch once retries are exhausted.
 */
function useFlagLoader(countryCode: string) {
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [errored, setErrored] = useState(false);

  // Reset loading state when the flag changes so stale images don't linger.
  useEffect(() => {
    setLoaded(false);
    setAttempt(0);
    setErrored(false);
  }, [countryCode]);

  // Auto-retry transient failures with a short backoff before giving up.
  useEffect(() => {
    if (!errored || attempt >= MAX_RETRIES) return;
    const id = setTimeout(() => {
      setErrored(false);
      setAttempt((a) => a + 1);
    }, 400 * (attempt + 1));
    return () => clearTimeout(id);
  }, [errored, attempt]);

  const handleLoad = useCallback(() => {
    setErrored(false);
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setLoaded(false);
    setErrored(true);
  }, []);

  const retry = useCallback(() => {
    setLoaded(false);
    setErrored(false);
    setAttempt((a) => a + 1);
  }, []);

  const exhausted = errored && attempt >= MAX_RETRIES;
  return { loaded, attempt, exhausted, handleLoad, handleError, retry };
}

interface FlagPictureProps {
  countryCode: string;
  requestWidth: number;
  containerStyle: StyleProp<ViewStyle>;
  imageStyle: StyleProp<ImageStyle>;
  placeholderStyle: StyleProp<ViewStyle>;
  transition: number;
  priority?: 'low' | 'normal' | 'high';
  hideLabel?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel: string;
}

/** Shared flag renderer: placeholder + image with loading/retry handling. */
function FlagPicture({
  countryCode,
  requestWidth,
  containerStyle,
  imageStyle,
  placeholderStyle,
  transition,
  priority,
  hideLabel,
  labelStyle,
  accessibilityLabel,
}: FlagPictureProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { loaded, attempt, exhausted, handleLoad, handleError, retry } = useFlagLoader(countryCode);

  const onRetryPress = useCallback(() => {
    hapticTap();
    retry();
  }, [retry]);

  const fallbackText = hideLabel ? t('common.tapToRetry') : countryCode.toUpperCase();

  return (
    <View
      style={containerStyle}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {!loaded && (
        exhausted ? (
          <Pressable
            style={placeholderStyle}
            onPress={onRetryPress}
            accessibilityRole="button"
            accessibilityLabel={t('common.tapToRetry')}
          >
            <Text style={[styles.errorText, labelStyle]} numberOfLines={1}>{fallbackText}</Text>
          </Pressable>
        ) : (
          <View style={placeholderStyle}>
            <ActivityIndicator size="small" color={colors.textTertiary} />
          </View>
        )
      )}
      <Image
        source={{ uri: getFlagUrl(countryCode, requestWidth, attempt) }}
        style={imageStyle}
        contentFit="contain"
        transition={transition}
        priority={priority}
        cachePolicy="memory-disk"
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
}

export default function FlagImage({ countryCode, size = 'large', fill, style, accessibilityLabel, transition: transitionProp, hideLabel }: FlagImageProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const transitionMs = transitionProp ?? 200;

  const a11yLabel = accessibilityLabel || t('common.flagOf', { country: countryCode.toUpperCase() });

  const fill100 = { width: '100%' as const, height: '100%' as const };
  // Hero fills parent width via aspectRatio; sized uses fixed pixels (or fills when `fill`).
  const innerSize = size === 'hero' ? fill100 : fill ? fill100 : SIZE_MAP[size];
  const containerSize = size === 'hero' ? { width: '100%' as const, aspectRatio: 3 / 2 } : innerSize;
  const requestWidth = (size === 'hero' ? Math.min(screenWidth, 500) : SIZE_MAP[size].width) * 2;

  return (
    <FlagPicture
      countryCode={countryCode}
      requestWidth={requestWidth}
      containerStyle={[styles.container, containerSize, style]}
      imageStyle={[styles.image, innerSize]}
      placeholderStyle={[styles.placeholder, innerSize]}
      transition={transitionMs}
      priority={size === 'hero' ? 'high' : undefined}
      hideLabel={hideLabel}
      accessibilityLabel={a11yLabel}
    />
  );
}

export function FlagImageSmall({ countryCode }: { countryCode: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <FlagPicture
      countryCode={countryCode}
      requestWidth={112}
      containerStyle={styles.smallContainer}
      imageStyle={styles.smallImage}
      placeholderStyle={[styles.placeholder, { width: 56, height: 37 }]}
      transition={150}
      labelStyle={{ fontSize: fontSize.xs }}
      accessibilityLabel={t('common.flagOf', { country: countryCode.toUpperCase() })}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  smallContainer: {
    width: 56,
    height: 37,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.ruleDark,
  },
  smallImage: {
    width: 56,
    height: 37,
    backgroundColor: 'transparent',
  },
});
