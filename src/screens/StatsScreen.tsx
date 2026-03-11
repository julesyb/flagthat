import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, fontFamily, fontSize, borderRadius } from '../utils/theme';
import { UserStats } from '../types';
import { getStats, getFlagStats, FlagStats, getDayStreak, getBadgeData, getMissedFlagIds, BadgeData } from '../utils/storage';
import { getAllFlags, getTotalFlagCount } from '../data';
import { t } from '../utils/i18n';
import { FlagImageSmall } from '../components/FlagImage';
import BottomNav from '../components/BottomNav';
import { evaluateBadges, BADGES, TIER_COLORS, BadgeIcon } from '../utils/badges';
import { FlagIcon, GlobeIcon, CheckIcon, PlayIcon, LightningIcon, CalendarIcon, ClockIcon, CrosshairIcon, LinkIcon } from '../components/Icons';

const RANK_COLORS = [colors.gradeS, colors.textTertiary, colors.warning];

export default function StatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [flagStats, setFlagStats] = useState<FlagStats>({});
  const [dayStreak, setDayStreak] = useState(0);
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [weakFlagCount, setWeakFlagCount] = useState(0);

  const flagNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of getAllFlags()) {
      map[f.id] = f.name;
    }
    return map;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadData() {
        try {
          const [s, fs, ds, bd, missed] = await Promise.all([
            getStats(),
            getFlagStats(),
            getDayStreak(),
            getBadgeData(),
            getMissedFlagIds(),
          ]);
          if (!cancelled) {
            setStats(s);
            setFlagStats(fs);
            setDayStreak(ds);
            setBadgeData(bd);
            setWeakFlagCount(missed.length);
          }
        } catch (e) {
          // Ensure we still show something even if storage fails
          if (!cancelled) {
            setStats((prev) => prev ?? {
              totalGamesPlayed: 0,
              totalCorrect: 0,
              totalAnswered: 0,
              bestStreak: 0,
              bestTimeAttackScore: 0,
              modeStats: {
                easy: { correct: 0, total: 0 },
                medium: { correct: 0, total: 0 },
                hard: { correct: 0, total: 0 },
                flagflash: { correct: 0, total: 0 },
                flagpuzzle: { correct: 0, total: 0 },
                timeattack: { correct: 0, total: 0 },
                neighbors: { correct: 0, total: 0 },
                impostor: { correct: 0, total: 0 },
                capitalconnection: { correct: 0, total: 0 },
                daily: { correct: 0, total: 0 },
                practice: { correct: 0, total: 0 },
                baseline: { correct: 0, total: 0 },
              },
              categoryStats: {},
            });
          }
        }
      }

      loadData();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const top10 = React.useMemo(() => {
    return Object.entries(flagStats)
      .filter(([, s]) => s.right > 0)
      .sort(([, a], [, b]) => b.right - a.right)
      .slice(0, 10);
  }, [flagStats]);

  const bottom10 = React.useMemo(() => {
    return Object.entries(flagStats)
      .filter(([, s]) => s.wrong > 0 && s.rightStreak < 3)
      .sort(([, a], [, b]) => b.wrong - a.wrong)
      .slice(0, 10);
  }, [flagStats]);

  const earnedBadges = React.useMemo(() => {
    if (!badgeData || !stats) return [];
    return evaluateBadges({
      stats,
      flagStats,
      dayStreak,
      dailyChallengesCompleted: badgeData.dailyChallengesCompleted,
      hasShared: badgeData.hasShared,
      lastGamePerfect10: badgeData.lastGamePerfect10,
      lastGameSRank: badgeData.lastGameSRank,
      weakFlagCount,
    });
  }, [stats, flagStats, dayStreak, badgeData, weakFlagCount]);

  if (!stats) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={s.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalFlags = getTotalFlagCount();
  const countriesSeen = Object.values(flagStats).filter((fs) => fs.right > 0).length;
  const overallAccuracy =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0;
  const progressPct = totalFlags > 0 ? Math.round((countriesSeen / totalFlags) * 100) : 0;

  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  const renderBadgeIcon = (icon: BadgeIcon, earned: boolean, tierColor: string) => {
    const iconColor = earned ? tierColor : colors.textTertiary;
    const size = 18;
    switch (icon) {
      case 'flag': return <FlagIcon size={size} color={iconColor} />;
      case 'globe': return <GlobeIcon size={size} color={iconColor} />;
      case 'check': return <CheckIcon size={size} color={iconColor} />;
      case 'play': return <PlayIcon size={size} color={iconColor} />;
      case 'lightning': return <LightningIcon size={size} color={iconColor} />;
      case 'calendar': return <CalendarIcon size={size} color={iconColor} />;
      case 'clock': return <ClockIcon size={size} color={iconColor} />;
      case 'crosshair': return <CrosshairIcon size={size} color={iconColor} />;
      case 'link': return <LinkIcon size={size} color={iconColor} />;
      default: return <FlagIcon size={size} color={iconColor} />;
    }
  };

  const accuracyLabel =
    overallAccuracy === 100 ? t('stats.perfect') :
    overallAccuracy >= 90 ? t('stats.excellent') :
    overallAccuracy >= 70 ? t('stats.great') :
    overallAccuracy > 0 ? t('stats.keepGoing') : '';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STAT TILES ── */}
        <View style={s.tileGrid}>
          <View style={s.tileRow}>
            <View style={[s.tile, s.tileDark]}>
              <Text style={[s.tileLabel, s.tileLabelDark]}>{t('stats.bestStreak')}</Text>
              <Text style={[s.tileVal, { color: colors.white }]}>{stats.bestStreak}</Text>
              <Text style={[s.tileSub, s.tileSubDark]}>{t('stats.personalBest')}</Text>
            </View>
            <View style={s.tile}>
              <Text style={s.tileLabel}>{t('stats.accuracy')}</Text>
              <Text style={s.tileVal}>{overallAccuracy}<Text style={s.tileUnit}>%</Text></Text>
              {accuracyLabel ? (
                <Text style={[s.tileSub, overallAccuracy >= 70 && { color: colors.success }]}>{accuracyLabel}</Text>
              ) : null}
            </View>
          </View>
          <View style={s.tileRow}>
            <View style={s.tile}>
              <Text style={s.tileLabel}>{t('stats.gamesPlayed')}</Text>
              <Text style={s.tileVal}>{stats.totalGamesPlayed}</Text>
            </View>
            <View style={s.tile}>
              <Text style={s.tileLabel}>{t('stats.dayStreak')}</Text>
              <Text style={s.tileVal}>{dayStreak}</Text>
              {dayStreak > 0 && <Text style={s.tileSub}>{t('stats.playTomorrow')}</Text>}
            </View>
          </View>

          {/* Progress tile - full width */}
          <View style={[s.tile, s.tileFull]}>
            <Text style={s.tileLabel}>{t('stats.countriesUnlocked')}</Text>
            <Text style={s.tileVal}>{countriesSeen}<Text style={s.tileUnit}>{t('stats.countriesOf', { seen: countriesSeen, total: totalFlags })}</Text></Text>
            <View style={s.progressWrap}>
              <View style={[s.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={s.progressLabels}>
              <Text style={s.progressLabelBold}>{t('stats.percentComplete', { pct: progressPct })}</Text>
              <Text style={s.progressLabelMuted}>{t('stats.toGo', { count: totalFlags - countriesSeen })}</Text>
            </View>
          </View>

          {(stats.bestTimeAttackScore || 0) > 0 && (
            <View style={[s.tile, s.tileFull]}>
              <Text style={s.tileLabel}>{t('stats.bestTimedQuiz')}</Text>
              <Text style={s.tileVal}>{stats.bestTimeAttackScore}<Text style={s.tileUnit}> {t('stats.in60s')}</Text></Text>
            </View>
          )}
        </View>

        {/* ── BADGES ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t('stats.badges')}</Text>
          <Text style={s.sectionMeta}>{t('stats.badgesEarned', { earned: earnedBadges.length, total: BADGES.length })}</Text>
        </View>
        <View style={s.badgeGrid}>
          {BADGES.map((badge) => {
            const earned = earnedIds.has(badge.id);
            const tierColor = TIER_COLORS[badge.tier];
            return (
              <View key={badge.id} style={[s.badgeCard, !earned && s.badgeCardLocked]}>
                <View style={[s.badgeIconWrap, { backgroundColor: earned ? tierColor + '18' : colors.surfaceSecondary }]}>
                  {renderBadgeIcon(badge.icon, earned, tierColor)}
                </View>
                <Text style={[s.badgeName, !earned && s.badgeNameLocked]}>{badge.name}</Text>
                <Text style={[s.badgeDesc, !earned && s.badgeDescLocked]}>{badge.description}</Text>
              </View>
            );
          })}
        </View>

        {/* ── TOP 10 ── */}
        {top10.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('stats.bestFlags')}</Text>
              <Text style={s.sectionMeta}>{t('stats.alwaysRight')}</Text>
            </View>
            {top10.map(([id, fs], i) => (
              <View key={id} style={s.rankRow}>
                <Text style={[s.rank, i < 3 && { color: RANK_COLORS[i] }]}>{i + 1}</Text>
                <FlagImageSmall countryCode={id} emoji="" />
                <Text style={s.rankName}>{flagNameMap[id] || id}</Text>
                <View style={s.scoreBadge}>
                  <Text style={s.scoreBadgeText}>{fs.right}x</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── BOTTOM 10 ── */}
        {bottom10.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('stats.weakFlags')}</Text>
              <Text style={s.sectionMeta}>{t('stats.practiceThese')}</Text>
            </View>
            {bottom10.map(([id, fs], i) => (
              <View key={id} style={s.rankRow}>
                <Text style={s.rank}>{i + 1}</Text>
                <FlagImageSmall countryCode={id} emoji="" />
                <Text style={s.rankName}>{flagNameMap[id] || id}</Text>
                <View style={[s.scoreBadge, s.scoreBadgeWrong]}>
                  <Text style={[s.scoreBadgeText, s.scoreBadgeTextWrong]}>{fs.wrong}x</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity
          style={s.settingsLink}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Text style={s.settingsLinkText}>{t('app.settings')}</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav activeTab="Stats" onNavigate={(tab) => {
        if (tab === 'Play') navigation.navigate('Home');
        else if (tab === 'Modes') navigation.navigate('GameSetup');
        else if (tab === 'Browse') navigation.navigate('Browse');
      }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: fontFamily.body, fontSize: fontSize.lg, color: colors.textSecondary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // ── Tile Grid
  tileGrid: { gap: 8, marginBottom: spacing.md },
  tileRow: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  tileFull: { flex: undefined },
  tileDark: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tileLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  tileLabelDark: { color: colors.whiteAlpha45 },
  tileVal: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.stat,
    lineHeight: 40,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tileUnit: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
  tileSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  tileSubDark: { color: colors.whiteAlpha45 },

  // ── Progress
  progressWrap: {
    height: 7,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabelBold: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  progressLabelMuted: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },

  // ── Section
  sectionTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xl,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.ink,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionMeta: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },

  // ── Rank Rows
  rankRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: colors.textTertiary,
    minWidth: 20,
    textAlign: 'center',
  },
  rankName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.ink,
    flex: 1,
  },
  scoreBadge: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  scoreBadgeText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  scoreBadgeWrong: {
    backgroundColor: colors.errorBg,
  },
  scoreBadgeTextWrong: {
    color: colors.error,
  },

  // ── Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  badgeCardLocked: {
    opacity: 0.45,
  },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.caption,
    color: colors.ink,
    marginBottom: 3,
  },
  badgeNameLocked: {
    color: colors.textTertiary,
  },
  badgeDesc: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  badgeDescLocked: {
    color: colors.textTertiary,
  },

  // ── Footer
  settingsLink: {
    marginTop: spacing.xl,
    padding: spacing.md,
    alignItems: 'center',
  },
  settingsLinkText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
});
