import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontFamily, fontSize, spacing, borderRadius } from '../utils/theme';
import { HeartIcon, PlayIcon } from './Icons';
import { showRewardedAd, isAdAvailable } from '../utils/ads';
import { getSupportData, recordAdWatched, SupportData } from '../utils/storage';
import { hapticTap, hapticCorrect } from '../utils/feedback';
import { t } from '../utils/i18n';

const MIN_GAMES_BEFORE_SHOWING = 3;

interface SupportCardProps {
  gamesPlayed: number;
}

export default function SupportCard({ gamesPlayed }: SupportCardProps) {
  const [support, setSupport] = useState<SupportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [justThanked, setJustThanked] = useState(false);
  const [adFailed, setAdFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSupportData().then(setSupport);
      setJustThanked(false);
      setAdFailed(false);
    }, []),
  );

  if (!isAdAvailable()) return null;
  if (gamesPlayed < MIN_GAMES_BEFORE_SHOWING) return null;

  const handleWatch = async () => {
    if (loading) return;
    hapticTap();
    setLoading(true);
    setAdFailed(false);

    const rewarded = await showRewardedAd();
    if (rewarded) {
      const updated = await recordAdWatched();
      setSupport(updated);
      setJustThanked(true);
      hapticCorrect();
      setTimeout(() => setJustThanked(false), 5000);
    } else {
      setAdFailed(true);
      setTimeout(() => setAdFailed(false), 4000);
    }
    setLoading(false);
  };

  const totalWatched = support?.totalAdsWatched ?? 0;
  const isSupporter = totalWatched > 0;

  // ── Thank-you state (shown briefly after watching)
  if (justThanked) {
    return (
      <View style={[styles.card, styles.cardThanked]}>
        <HeartIcon size={16} color={colors.success} strokeWidth={2} filled />
        <Text style={styles.thankedText}>{t('support.thankYou')}</Text>
      </View>
    );
  }

  // ── Returning supporter: compact row
  if (isSupporter) {
    return (
      <View style={[styles.card, styles.cardCompactWrap]}>
        <TouchableOpacity
          style={styles.cardCompact}
          onPress={handleWatch}
          activeOpacity={0.85}
          disabled={loading}
        >
          <HeartIcon size={14} color={colors.accent} strokeWidth={2} filled />
          <Text style={styles.compactText}>
            {totalWatched === 1
              ? t('support.totalWatched', { count: totalWatched })
              : t('support.totalWatchedPlural', { count: totalWatched })}
          </Text>
          <View style={styles.compactBtn}>
            <PlayIcon size={8} color={colors.white} />
            <Text style={styles.compactBtnText}>
              {loading ? '...' : t('support.watchAgain')}
            </Text>
          </View>
        </TouchableOpacity>
        {adFailed && (
          <Text style={styles.failedText}>{t('support.adFailed')}</Text>
        )}
      </View>
    );
  }

  // ── First-time: full pitch
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <HeartIcon size={14} color={colors.accent} strokeWidth={2} filled />
        <Text style={styles.title}>{t('support.title')}</Text>
      </View>

      <Text style={styles.subtitle}>{t('support.subtitle')}</Text>

      <TouchableOpacity
        style={[styles.watchBtn, loading && styles.watchBtnDisabled]}
        onPress={handleWatch}
        activeOpacity={0.85}
        disabled={loading}
      >
        <PlayIcon size={10} color={colors.white} />
        <Text style={styles.watchBtnText}>
          {loading ? '...' : t('support.watchButton')}
        </Text>
      </TouchableOpacity>

      {adFailed && (
        <Text style={styles.failedText}>{t('support.adFailed')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  cardThanked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    paddingVertical: spacing.md,
  },
  cardCompactWrap: {
    paddingVertical: 0,
    padding: 0,
  },
  cardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  watchBtnDisabled: {
    opacity: 0.5,
  },
  watchBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.white,
  },
  thankedText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.body,
    color: colors.success,
  },
  compactText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.ink,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + spacing.xxs,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  compactBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.white,
  },
  failedText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
