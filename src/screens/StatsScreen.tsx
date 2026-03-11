import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, fontFamily, fontSize, borderRadius } from '../utils/theme';
import { UserStats, GameMode, CategoryId } from '../types';
import { getStats, getFlagStats, FlagStats, getDayStreak, getBadgeData, getMissedFlagIds, BadgeData, getSupportData, getGameHistory, GameHistoryEntry, getBaselineData, BaselineData } from '../utils/storage';
import { getAllFlags, getTotalFlagCount } from '../data';
import { getGrade } from '../utils/gameEngine';
import { t } from '../utils/i18n';
import { FlagImageSmall } from '../components/FlagImage';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import { evaluateBadges, BADGES, TIER_COLORS, BadgeIcon, BadgeCheckContext, getBadgeProgress } from '../utils/badges';
import { FlagIcon, GlobeIcon, CheckIcon, PlayIcon, LightningIcon, CalendarIcon, ClockIcon, CrosshairIcon, LinkIcon, HeartIcon, ChevronRightIcon, BarChartIcon } from '../components/Icons';

const RANK_COLORS = [colors.gradeS, colors.textTertiary, colors.warning];

const MODE_BREAKDOWN: { key: GameMode; labelKey: string }[] = [
  { key: 'easy', labelKey: 'modes.easy' },
  { key: 'medium', labelKey: 'modes.medium' },
  { key: 'hard', labelKey: 'modes.hard' },
  { key: 'timeattack', labelKey: 'modes.timeattack' },
  { key: 'daily', labelKey: 'modes.daily' },
  { key: 'neighbors', labelKey: 'modes.neighbors' },
  { key: 'impostor', labelKey: 'modes.impostor' },
  { key: 'capitalconnection', labelKey: 'modes.capitalconnection' },
];

const REGIONS: CategoryId[] = ['africa', 'asia', 'europe', 'americas', 'oceania'];

export default function StatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const onNavigate = useNavTabs();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [flagStats, setFlagStats] = useState<FlagStats>({});
  const [dayStreak, setDayStreak] = useState(0);
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [weakFlagCount, setWeakFlagCount] = useState(0);
  const [adsWatched, setAdsWatched] = useState(0);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);

  // ── Animation values ──
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(12)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayAcc, setDisplayAcc] = useState(0);
  const gradeScale = useRef(new Animated.Value(0)).current;
  const gradeOpacity = useRef(new Animated.Value(0)).current;
  const progressFade = useRef(new Animated.Value(0)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const regionFade = useRef(new Animated.Value(0)).current;
  const modeFade = useRef(new Animated.Value(0)).current;
  const restFade = useRef(new Animated.Value(0)).current;

  const flagNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of getAllFlags()) map[f.id] = f.name;
    return map;
  }, []);

  // Count-up listener
  React.useEffect(() => {
    const listenerId = countAnim.addListener(({ value }) => {
      setDisplayAcc(Math.round(value));
    });
    return () => countAnim.removeListener(listenerId);
  }, [countAnim]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // Reset all animations
      heroFade.setValue(0);
      heroSlide.setValue(12);
      countAnim.setValue(0);
      setDisplayAcc(0);
      gradeScale.setValue(0);
      gradeOpacity.setValue(0);
      progressFade.setValue(0);
      progressBarAnim.setValue(0);
      regionFade.setValue(0);
      modeFade.setValue(0);
      restFade.setValue(0);

      async function loadData() {
        try {
          const [s, fs, ds, bd, missed, gh, support, bl] = await Promise.all([
            getStats(), getFlagStats(), getDayStreak(), getBadgeData(), getMissedFlagIds(), getGameHistory(), getSupportData(), getBaselineData(),
          ]);
          if (!cancelled) {
            setStats(s);
            setFlagStats(fs);
            setDayStreak(ds);
            setBadgeData(bd);
            setWeakFlagCount(missed.length);
            setGameHistory(gh);
            setAdsWatched(support.totalAdsWatched);
            setBaseline(bl);

            // ── Kick off animation sequence after data loads ──
            const acc = s.totalAnswered > 0
              ? Math.round((s.totalCorrect / s.totalAnswered) * 100) : 0;
            const totalF = getTotalFlagCount();
            const seen = Object.values(fs).filter((f) => f.right > 0).length;
            const pct = totalF > 0 ? seen / totalF : 0;

            // Phase 1: Hero card slides in
            Animated.parallel([
              Animated.timing(heroFade, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.spring(heroSlide, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
            ]).start();

            // Phase 2: Accuracy count-up (0 → target)
            Animated.timing(countAnim, {
              toValue: acc, duration: 1000, delay: 200,
              easing: Easing.out(Easing.cubic), useNativeDriver: false,
            }).start();

            // Phase 3: Grade springs in after count-up
            const gradeDelay = 1200;
            Animated.parallel([
              Animated.spring(gradeScale, {
                toValue: 1, friction: 4, tension: 100, delay: gradeDelay, useNativeDriver: true,
              }),
              Animated.timing(gradeOpacity, {
                toValue: 1, duration: 200, delay: gradeDelay, useNativeDriver: true,
              }),
            ]).start();

            // Phase 4: Progress section
            const progressDelay = gradeDelay + 300;
            Animated.timing(progressFade, {
              toValue: 1, duration: 300, delay: progressDelay, useNativeDriver: true,
            }).start();
            Animated.timing(progressBarAnim, {
              toValue: pct, duration: 800, delay: progressDelay + 100,
              easing: Easing.out(Easing.cubic), useNativeDriver: false,
            }).start();

            // Phase 5: Region breakdown
            Animated.timing(regionFade, {
              toValue: 1, duration: 300, delay: progressDelay + 300, useNativeDriver: true,
            }).start();

            // Phase 6: Mode breakdown
            Animated.timing(modeFade, {
              toValue: 1, duration: 300, delay: progressDelay + 500, useNativeDriver: true,
            }).start();

            // Phase 7: Rest (badges, ranks, settings)
            Animated.timing(restFade, {
              toValue: 1, duration: 400, delay: progressDelay + 700, useNativeDriver: true,
            }).start();
          }
        } catch {
          if (!cancelled) {
            setStats((prev) => prev ?? {
              totalGamesPlayed: 0, totalCorrect: 0, totalAnswered: 0,
              bestStreak: 0, bestTimeAttackScore: 0,
              modeStats: {
                easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 },
                hard: { correct: 0, total: 0 }, flagflash: { correct: 0, total: 0 },
                flagpuzzle: { correct: 0, total: 0 }, timeattack: { correct: 0, total: 0 },
                neighbors: { correct: 0, total: 0 }, impostor: { correct: 0, total: 0 },
                capitalconnection: { correct: 0, total: 0 }, daily: { correct: 0, total: 0 },
                practice: { correct: 0, total: 0 }, baseline: { correct: 0, total: 0 },
              },
              categoryStats: {},
            });
          }
        }
      }
      loadData();
      return () => { cancelled = true; };
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
      stats, flagStats, dayStreak,
      dailyChallengesCompleted: badgeData.dailyChallengesCompleted,
      hasShared: badgeData.hasShared,
      lastGamePerfect10: badgeData.lastGamePerfect10,
      lastGameSRank: badgeData.lastGameSRank,
      weakFlagCount,
      adsWatched,
    });
  }, [stats, flagStats, dayStreak, badgeData, weakFlagCount, adsWatched]);

  // ── Next milestone computation ──
  const nextMilestone = React.useMemo(() => {
    if (!stats) return null;
    const earnedIds = new Set(earnedBadges.map((b) => b.id));
    const countriesSeen = Object.values(flagStats).filter((fs) => fs.right > 0).length;
    const totalF = getTotalFlagCount();

    // Check each badge for proximity
    const candidates: { badge: typeof BADGES[0]; progress: number; target: number; remaining: number }[] = [];

    for (const badge of BADGES) {
      if (earnedIds.has(badge.id)) continue;
      let progress = 0;
      let target = 0;

      switch (badge.id) {
        case 'first_flag': progress = stats.totalGamesPlayed; target = 1; break;
        case 'globe_trotter': progress = countriesSeen; target = 50; break;
        case 'world_citizen': progress = countriesSeen; target = 100; break;
        case 'flag_master': progress = countriesSeen; target = totalF; break;
        case 'ten_timer': progress = stats.totalGamesPlayed; target = 10; break;
        case 'century_club': progress = stats.totalGamesPlayed; target = 100; break;
        case 'hot_streak': progress = stats.bestStreak; target = 10; break;
        case 'on_fire': progress = stats.bestStreak; target = 25; break;
        case 'unstoppable': progress = stats.bestStreak; target = 50; break;
        case 'day_tripper': progress = dayStreak; target = 3; break;
        case 'week_warrior': progress = dayStreak; target = 7; break;
        case 'month_master': progress = dayStreak; target = 30; break;
        case 'speed_demon': progress = stats.bestTimeAttackScore; target = 15; break;
        case 'lightning_round': progress = stats.bestTimeAttackScore; target = 25; break;
        default: continue;
      }

      if (target > 0 && progress > 0) {
        const remaining = target - progress;
        const pctComplete = progress / target;
        if (pctComplete >= 0.3) {
          candidates.push({ badge, progress, target, remaining });
        }
      }
    }

    if (candidates.length === 0) return null;
    // Pick the one closest to completion
    candidates.sort((a, b) => (a.remaining / a.target) - (b.remaining / b.target));
    return candidates[0];
  }, [stats, earnedBadges, flagStats, dayStreak]);

  // Score distribution: bucket accuracies into ranges
  // (must be above the early return to satisfy Rules of Hooks)
  const distribution = React.useMemo(() => {
    if (gameHistory.length === 0) return null;
    const buckets = [
      { label: '90-100', min: 90, max: 100, count: 0 },
      { label: '70-89', min: 70, max: 89, count: 0 },
      { label: '50-69', min: 50, max: 69, count: 0 },
      { label: '0-49', min: 0, max: 49, count: 0 },
    ];
    for (const entry of gameHistory) {
      for (const bucket of buckets) {
        if (entry.accuracy >= bucket.min && entry.accuracy <= bucket.max) {
          bucket.count++;
          break;
        }
      }
    }
    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, maxCount, total: gameHistory.length };
  }, [gameHistory]);

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
  const overallAccuracy = stats.totalAnswered > 0
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
  const progressPct = totalFlags > 0 ? Math.round((countriesSeen / totalFlags) * 100) : 0;
  const grade = overallAccuracy > 0 ? getGrade(overallAccuracy) : null;
  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  const playedModes = MODE_BREAKDOWN.filter(({ key }) => stats.modeStats[key].total > 0);

  // Badge check context for progress bars
  const badgeCtx: BadgeCheckContext | null = badgeData ? {
    stats, flagStats, dayStreak,
    dailyChallengesCompleted: badgeData.dailyChallengesCompleted,
    hasShared: badgeData.hasShared,
    lastGamePerfect10: badgeData.lastGamePerfect10,
    lastGameSRank: badgeData.lastGameSRank,
    weakFlagCount,
    adsWatched,
  } : null;

  // Region accuracy data (only regions with games played)
  const regionData = REGIONS
    .map((regionId) => {
      const cs = stats.categoryStats[regionId];
      if (!cs || cs.total === 0) return null;
      const pct = Math.round((cs.correct / cs.total) * 100);
      return { id: regionId, pct, correct: cs.correct, total: cs.total };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const progressBarWidth = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
      case 'heart': return <HeartIcon size={size} color={iconColor} filled />;
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenContainer>

        {/* ══════════════════════════════════════════════════════════
            HERO: Grade + animated accuracy count-up
            Mirrors the Results page hero reveal for cohesion
            ══════════════════════════════════════════════════════════ */}
        <Animated.View style={[
          s.heroCard,
          { opacity: heroFade, transform: [{ translateY: heroSlide }] },
        ]}>
          <Text style={s.heroEyebrow}>{t('stats.overallGrade')}</Text>

          {/* Animated accuracy number */}
          <Text style={s.heroAccuracy}>{displayAcc}%</Text>

          {/* Grade springs in after count-up */}
          {grade && (
            <Animated.View style={[
              s.heroGradeWrap,
              { opacity: gradeOpacity, transform: [{ scale: gradeScale }] },
            ]}>
              <Text style={[s.heroGrade, { color: grade.color }]}>{grade.label}</Text>
              {accuracyLabel ? (
                <Text style={[s.heroAccLabel, overallAccuracy >= 70 && { color: colors.successTextOnDark }]}>
                  {accuracyLabel}
                </Text>
              ) : null}
            </Animated.View>
          )}

          <View style={s.heroDivider} />

          <View style={s.heroStatsRow}>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{stats.bestStreak}</Text>
              <Text style={s.heroStatLabel}>{t('stats.bestStreak')}</Text>
            </View>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{stats.totalGamesPlayed}</Text>
              <Text style={s.heroStatLabel}>{t('stats.gamesPlayed')}</Text>
            </View>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{dayStreak}</Text>
              <Text style={s.heroStatLabel}>{t('stats.dayStreak')}</Text>
              {dayStreak > 0 && <Text style={s.heroStatHint}>{t('stats.playTomorrow')}</Text>}
            </View>
          </View>
        </Animated.View>

        {/* ── COUNTRIES PROGRESS (animated bar) ── */}
        <Animated.View style={[s.tile, { opacity: progressFade }]}>
          <Text style={s.tileLabel}>{t('stats.countriesUnlocked')}</Text>
          <Text style={s.tileVal}>{countriesSeen}<Text style={s.tileUnit}> / {totalFlags}</Text></Text>
          <View style={s.progressWrap}>
            <Animated.View style={[s.progressFill, { width: progressBarWidth }]} />
          </View>
          <View style={s.progressLabels}>
            <Text style={s.progressLabelBold}>{t('stats.percentComplete', { pct: progressPct })}</Text>
            <Text style={s.progressLabelMuted}>{t('stats.toGo', { count: totalFlags - countriesSeen })}</Text>
          </View>
        </Animated.View>

        {(stats.bestTimeAttackScore || 0) > 0 && (
          <Animated.View style={[s.tile, { marginTop: 8, opacity: progressFade }]}>
            <Text style={s.tileLabel}>{t('stats.bestTimedQuiz')}</Text>
            <Text style={s.tileVal}>{stats.bestTimeAttackScore}<Text style={s.tileUnit}> {t('stats.in60s')}</Text></Text>
          </Animated.View>
        )}

        {/* ── NEXT MILESTONE (goal proximity) ── */}
        {nextMilestone && (
          <Animated.View style={[s.milestoneCard, { opacity: progressFade }]}>
            <View style={[s.milestoneIconWrap, { backgroundColor: TIER_COLORS[nextMilestone.badge.tier] + '18' }]}>
              {renderBadgeIcon(nextMilestone.badge.icon, true, TIER_COLORS[nextMilestone.badge.tier])}
            </View>
            <View style={s.milestoneContent}>
              <Text style={s.milestoneTitle}>{nextMilestone.badge.name}</Text>
              <View style={s.milestoneBarWrap}>
                <View style={[s.milestoneBarFill, { width: `${Math.round((nextMilestone.progress / nextMilestone.target) * 100)}%` }]} />
              </View>
              <Text style={s.milestoneSub}>
                {nextMilestone.progress} / {nextMilestone.target} - {t('stats.moreToUnlock', { count: nextMilestone.remaining })}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── PRACTICE WEAK CTA ── */}
        {weakFlagCount > 0 && (
          <Animated.View style={{ opacity: progressFade }}>
            <TouchableOpacity
              style={s.practiceCta}
              onPress={() => navigation.navigate('Game' as keyof RootStackParamList, {
                config: { mode: 'practice', category: 'all', questionCount: weakFlagCount, displayMode: 'flag' },
              } as never)}
              activeOpacity={0.7}
            >
              <View style={s.practiceCtaLeft}>
                <CrosshairIcon size={16} color={colors.accent} />
              </View>
              <View style={s.practiceCtaContent}>
                <Text style={s.practiceCtaTitle}>{t('stats.practiceNow')}</Text>
                <Text style={s.practiceCtaSub}>{t('results.flagsToReview', { count: weakFlagCount })}</Text>
              </View>
              <ChevronRightIcon size={16} color={colors.accent} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════
            REGION ACCURACY: How well you know each continent
            ══════════════════════════════════════════════════════════ */}
        {regionData.length > 0 && (
          <Animated.View style={{ opacity: regionFade }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('categories.byRegion')}</Text>
            </View>

            {/* Dedicated region improvement cards (when baseline exists) */}
            {regionData.some(({ id }) => baseline?.regions[id as keyof typeof baseline.regions]) && (
              <View style={s.regionCards}>
                {regionData.map(({ id, pct }) => {
                  const baselineResult = baseline?.regions[id as keyof typeof baseline.regions];
                  if (!baselineResult) return null;
                  const baselinePct = baselineResult.accuracy;
                  const diff = pct - baselinePct;
                  const isUp = diff > 0;
                  const isDown = diff < 0;
                  return (
                    <View key={id} style={s.regionImprovCard}>
                      <Text style={s.regionImprovName}>{t(`categories.${id}`)}</Text>
                      <View style={s.regionImprovStats}>
                        <View style={s.regionImprovCol}>
                          <Text style={s.regionImprovLabel}>{t('stats.baselineLabel', { pct: baselinePct })}</Text>
                        </View>
                        <View style={s.regionImprovArrow}>
                          <Text style={s.regionImprovArrowText}>{isUp ? '\u2192' : isDown ? '\u2192' : '='}</Text>
                        </View>
                        <View style={s.regionImprovCol}>
                          <Text style={[s.regionImprovNow, pct >= 70 && s.regionImprovNowGood]}>{pct}%</Text>
                        </View>
                      </View>
                      <Text style={[
                        s.regionImprovDiff,
                        isUp && s.regionImprovDiffUp,
                        isDown && s.regionImprovDiffDown,
                      ]}>
                        {isUp
                          ? t('stats.improvementUp', { pct: diff })
                          : isDown
                          ? t('stats.improvementDown', { pct: Math.abs(diff) })
                          : t('stats.improvementSame')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Standard bar chart */}
            <View style={s.modeBreakdown}>
              {regionData.map(({ id, pct }) => {
                const barWidth = Math.max(pct, 2);
                return (
                  <View key={id} style={s.modeRow}>
                    <Text style={s.modeLabel}>{t(`categories.${id}`)}</Text>
                    <View style={s.modeBarWrap}>
                      <View style={[s.modeBarFill, { width: `${barWidth}%` }, pct >= 70 && s.modeBarGood]} />
                    </View>
                    <Text style={[s.modePct, pct >= 70 && s.modePctGood]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── MODE BREAKDOWN ── */}
        {playedModes.length > 0 && (
          <Animated.View style={{ opacity: modeFade }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('stats.byModeLabel')}</Text>
            </View>
            <View style={s.modeBreakdown}>
              {playedModes.map(({ key, labelKey }) => {
                const ms = stats.modeStats[key];
                const pct = ms.total > 0 ? Math.round((ms.correct / ms.total) * 100) : 0;
                const barWidth = Math.max(pct, 2);
                return (
                  <View key={key} style={s.modeRow}>
                    <Text style={s.modeLabel}>{t(labelKey)}</Text>
                    <View style={s.modeBarWrap}>
                      <View style={[s.modeBarFill, { width: `${barWidth}%` }, pct >= 70 && s.modeBarGood]} />
                    </View>
                    <Text style={[s.modePct, pct >= 70 && s.modePctGood]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── SCORE DISTRIBUTION ── */}
        {distribution && distribution.total >= 3 && (
          <Animated.View style={{ opacity: restFade }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t('stats.scoreDistribution')}</Text>
              <Text style={s.sectionMeta}>{t('results.gamesPlayed', { count: distribution.total })}</Text>
            </View>
            <View style={s.distCard}>
              {distribution.buckets.map((bucket) => {
                const barPct = distribution.maxCount > 0
                  ? Math.max((bucket.count / distribution.maxCount) * 100, bucket.count > 0 ? 4 : 0)
                  : 0;
                const isGood = bucket.min >= 70;
                return (
                  <View key={bucket.label} style={s.distRow}>
                    <Text style={s.distLabel}>{bucket.label}%</Text>
                    <View style={s.distBarWrap}>
                      <View style={[
                        s.distBarFill,
                        { width: `${barPct}%` },
                        isGood && s.distBarGood,
                      ]} />
                    </View>
                    <Text style={[s.distCount, isGood && s.distCountGood]}>{bucket.count}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── BADGES (with progress bars on locked) ── */}
        <Animated.View style={{ opacity: restFade }}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{t('stats.badges')}</Text>
            <Text style={s.sectionMeta}>{t('stats.badgesEarned', { earned: earnedBadges.length, total: BADGES.length })}</Text>
          </View>
          <View style={s.badgeGrid}>
            {BADGES.map((badge) => {
              const earned = earnedIds.has(badge.id);
              const tierColor = TIER_COLORS[badge.tier];
              const progress = !earned && badgeCtx ? getBadgeProgress(badge, badgeCtx) : null;
              return (
                <View key={badge.id} style={[s.badgeCard, !earned && s.badgeCardLocked]}>
                  <View style={[s.badgeIconWrap, { backgroundColor: earned ? tierColor + '18' : colors.surfaceSecondary }]}>
                    {renderBadgeIcon(badge.icon, earned, tierColor)}
                  </View>
                  <Text style={[s.badgeName, !earned && s.badgeNameLocked]}>{badge.name}</Text>
                  <Text style={[s.badgeDesc, !earned && s.badgeDescLocked]}>{badge.description}</Text>
                  {progress && progress.progress > 0 && (
                    <View style={s.badgeProgressWrap}>
                      <View style={[s.badgeProgressFill, { width: `${progress.pct}%` }]} />
                    </View>
                  )}
                  {progress && progress.progress > 0 && (
                    <Text style={s.badgeProgressText}>{progress.progress}/{progress.target}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── TOP 10 ── */}
        {top10.length > 0 && (
          <Animated.View style={{ opacity: restFade }}>
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
          </Animated.View>
        )}

        {/* ── BOTTOM 10 ── */}
        {bottom10.length > 0 && (
          <Animated.View style={{ opacity: restFade }}>
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
          </Animated.View>
        )}

        <Animated.View style={{ opacity: restFade }}>
          <TouchableOpacity
            style={s.settingsLink}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Text style={s.settingsLinkText}>{t('app.settings')}</Text>
            <ChevronRightIcon size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Stats" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: fontFamily.body, fontSize: fontSize.lg, color: colors.textSecondary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // ── Hero (mirrors Results v3 hero)
  heroCard: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroEyebrow: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.xxs,
    letterSpacing: 1.5, textTransform: 'uppercase',
    color: colors.whiteAlpha45, marginBottom: spacing.lg,
  },
  heroAccuracy: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.countdown, // 120px - same as Results hero
    color: colors.white,
    letterSpacing: -3,
    lineHeight: 120,
  },
  heroGradeWrap: {
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroGrade: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.gameTitle, // 42px
    letterSpacing: -1,
  },
  heroAccLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.caption,
    color: colors.whiteAlpha45,
    marginTop: spacing.xxs,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.whiteAlpha15,
    marginVertical: spacing.md,
    alignSelf: 'stretch',
  },
  heroStatsRow: { flexDirection: 'row' },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.heading,
    color: colors.white,
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.whiteAlpha45,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  heroStatHint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xxs,
    color: colors.whiteAlpha45,
    marginTop: 2,
  },

  // ── Tiles
  tile: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  tileLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
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

  // ── Next Milestone
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: spacing.sm,
    gap: 12,
  },
  milestoneIconWrap: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  milestoneContent: { flex: 1 },
  milestoneTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.caption,
    color: colors.ink,
    marginBottom: 6,
  },
  milestoneBarWrap: {
    height: 6, backgroundColor: colors.border,
    borderRadius: borderRadius.full, overflow: 'hidden',
  },
  milestoneBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
  },
  milestoneSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 4,
  },

  // ── Practice CTA
  practiceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  practiceCtaLeft: {
    width: 36,
    height: 36,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  practiceCtaContent: { flex: 1 },
  practiceCtaTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.body,
    color: colors.accent,
    marginBottom: 2,
  },
  practiceCtaSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // ── Mode/Region Breakdown
  modeBreakdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    width: 80,
  },
  modeBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  modeBarFill: {
    height: '100%',
    backgroundColor: colors.textTertiary,
    borderRadius: borderRadius.full,
  },
  modeBarGood: {
    backgroundColor: colors.success,
  },
  modePct: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    width: 36,
    textAlign: 'right',
  },
  modePctGood: {
    color: colors.success,
  },
  // ── Region improvement cards
  regionCards: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  regionImprovCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  regionImprovName: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  regionImprovStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  regionImprovCol: {
    flex: 1,
  },
  regionImprovLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  regionImprovArrow: {
    paddingHorizontal: spacing.xs,
  },
  regionImprovArrowText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
  regionImprovNow: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.heading,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'right',
  },
  regionImprovNowGood: {
    color: colors.success,
  },
  regionImprovDiff: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  regionImprovDiffUp: {
    color: colors.success,
  },
  regionImprovDiffDown: {
    color: colors.error,
  },

  // ── Section
  sectionTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTertiary,
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
    fontSize: fontSize.sm,
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
  scoreBadgeWrong: { backgroundColor: colors.errorBg },
  scoreBadgeTextWrong: { color: colors.error },

  // ── Score Distribution
  distCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    width: 56,
    textAlign: 'right',
  },
  distBarWrap: {
    flex: 1,
    height: 10,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    backgroundColor: colors.textTertiary,
    borderRadius: borderRadius.full,
  },
  distBarGood: {
    backgroundColor: colors.success,
  },
  distCount: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    width: 24,
    textAlign: 'right',
  },
  distCountGood: {
    color: colors.success,
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
  badgeCardLocked: { opacity: 0.45 },
  badgeIconWrap: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  badgeName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.caption,
    color: colors.ink,
    marginBottom: 3,
  },
  badgeNameLocked: { color: colors.textTertiary },
  badgeDesc: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  badgeDescLocked: { color: colors.textTertiary },
  badgeProgressWrap: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: 8,
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
  },
  badgeProgressText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xxs,
    color: colors.textTertiary,
    marginTop: 3,
  },

  // ── Footer
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  settingsLinkText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
});
