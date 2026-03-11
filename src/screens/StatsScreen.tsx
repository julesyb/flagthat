import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, fontFamily, borderRadius } from '../utils/theme';
import { UserStats, GAME_MODES, GameMode } from '../types';
import { getStats, getFlagStats, FlagStats, getDayStreak, markShared, getBadgeData, getMissedFlagIds, BadgeData } from '../utils/storage';
import { getAllFlags, getTotalFlagCount } from '../data';
import { hapticTap } from '../utils/feedback';
import { t } from '../utils/i18n';
import { FlagImageSmall } from '../components/FlagImage';
import BottomNav from '../components/BottomNav';
import { evaluateBadges, BADGES, TIER_COLORS } from '../utils/badges';

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

  const handleShare = async () => {
    hapticTap();
    const message =
      `Flag That\n\n` +
      `${stats.bestStreak} streak | ${overallAccuracy}% accuracy\n` +
      `${countriesSeen}/${totalFlags} countries\n` +
      `${stats.totalGamesPlayed} games played\n\n` +
      `Can you beat this?\nhttps://flagthat.app`;

    try {
      await Share.share({ message });
      markShared();
    } catch {
      // Share cancelled
    }
  };

  const earnedIds = new Set(earnedBadges.map((b) => b.id));

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
        {/* ── CHALLENGE CARD ── */}
        <View style={s.challengeCard}>
          <Text style={s.cardEyebrow}>{t('stats.yourResults')}</Text>
          <Text style={s.cardHeadline}>
            {t('stats.streakAcc', { streak: stats.bestStreak, accuracy: overallAccuracy })}
          </Text>
          <Text style={s.cardSub}>
            {t('stats.countriesGames', { countries: countriesSeen, games: stats.totalGamesPlayed })}
          </Text>
          <View style={s.cardPills}>
            <View style={s.pill}>
              <Text style={s.pillText}><Text style={s.pillBold}>{stats.bestStreak}</Text> {t('stats.bestStreak')}</Text>
            </View>
            {dayStreak > 0 && (
              <View style={s.pill}>
                <Text style={s.pillText}><Text style={s.pillBold}>{dayStreak}</Text> {t('stats.dayStreak')}</Text>
              </View>
            )}
            <View style={s.pill}>
              <Text style={s.pillText}><Text style={s.pillBold}>{countriesSeen}/{totalFlags}</Text> {t('home.countries')}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Text style={s.shareBtnText}>{t('common.share')}</Text>
          </TouchableOpacity>
        </View>

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
            return (
              <View key={badge.id} style={[s.badgeCard, !earned && s.badgeCardLocked]}>
                <View style={[s.badgeTierDot, { backgroundColor: earned ? TIER_COLORS[badge.tier] : colors.rule }]} />
                <Text style={[s.badgeName, !earned && s.badgeNameLocked]}>{badge.name}</Text>
                <Text style={[s.badgeDesc, !earned && s.badgeDescLocked]}>{badge.description}</Text>
              </View>
            );
          })}
        </View>

        {/* ── BY MODE ── */}
        <Text style={s.sectionTitle}>{t('stats.byMode')}</Text>
        {(Object.keys(GAME_MODES) as GameMode[])
          .filter((m) => !GAME_MODES[m].hidden && m !== 'daily' && m !== 'practice')
          .map((m) => {
            const ms = stats.modeStats[m] ?? { correct: 0, total: 0 };
            const acc = ms.total > 0 ? Math.round((ms.correct / ms.total) * 100) : 0;
            const played = ms.total > 0;
            return (
              <View key={m} style={s.modeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modeName}>{t(`modes.${m}`)}</Text>
                  <Text style={s.modeDetail}>
                    {played ? t('stats.modeCorrect', { correct: ms.correct, total: ms.total, pct: acc }) : t('stats.notPlayedYet')}
                  </Text>
                </View>
                <View style={[s.badge, played ? s.badgePlayed : s.badgeUnplayed]}>
                  <Text style={[s.badgeText, played ? s.badgeTextPlayed : s.badgeTextUnplayed]}>
                    {played ? `${acc}%` : t('common.new')}
                  </Text>
                </View>
              </View>
            );
          })}

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
  loadingText: { fontFamily: fontFamily.body, fontSize: 18, color: colors.textSecondary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // ── Challenge Card
  challengeCard: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.xl,
    padding: 24,
    marginBottom: spacing.md,
  },
  cardEyebrow: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 10,
  },
  cardHeadline: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 42,
    color: colors.white,
    letterSpacing: -0.5,
  },
  cardSub: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.whiteAlpha45,
    marginTop: 8,
  },
  cardPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  pill: {
    backgroundColor: colors.darkSurface,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    borderRadius: borderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  pillText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.whiteAlpha60,
  },
  pillBold: {
    fontFamily: fontFamily.bodyBold,
    color: colors.white,
  },
  shareBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 18,
  },
  shareBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.white,
  },

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
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 8,
  },
  tileLabelDark: { color: colors.whiteAlpha45 },
  tileVal: {
    fontFamily: fontFamily.display,
    fontSize: 38,
    lineHeight: 40,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tileUnit: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.textTertiary,
  },
  tileSub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 4,
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
    fontSize: 12,
    color: colors.ink,
  },
  progressLabelMuted: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textTertiary,
  },

  // ── Section
  sectionTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 19,
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
    fontSize: 13,
    color: colors.textTertiary,
  },

  // ── Mode Cards
  modeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  modeDetail: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  badgePlayed: { backgroundColor: colors.successBg },
  badgeUnplayed: { backgroundColor: colors.surfaceSecondary },
  badgeText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeTextPlayed: { color: colors.success },
  badgeTextUnplayed: { color: colors.textTertiary },

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
    fontSize: 19,
    color: colors.textTertiary,
    minWidth: 20,
    textAlign: 'center',
  },
  rankName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
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
    fontSize: 12,
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
  badgeTierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  badgeName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 3,
  },
  badgeNameLocked: {
    color: colors.textTertiary,
  },
  badgeDesc: {
    fontFamily: fontFamily.body,
    fontSize: 12,
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
    fontSize: 16,
    color: colors.textTertiary,
  },
});
