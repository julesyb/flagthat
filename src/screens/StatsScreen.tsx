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
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ThemeColors, spacing, fontFamily, fontSize, borderRadius, typography } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { UserStats, CategoryId, BaselineRegionId, BASELINE_REGIONS } from '../types';
import { getStats, getFlagStats, FlagStats, getDayStreakInfo, DayStreakInfo, getBadgeData, getMissedFlagIds, BadgeData, getGameHistory, GameHistoryEntry, getChallengeHistory, ChallengeHistoryEntry, MASTERED_STREAK, UNLOCK_THRESHOLD, getRegionScoreHistory, RegionScoreHistory, getPersistedLevel, persistLevel } from '../utils/storage';
import { GOOD_ACCURACY_PCT, UNLIMITED_QUESTIONS, TIMEATTACK_DEFAULT_TIME } from '../utils/config';
import { getAllFlags, getCategoryCount } from '../data';
import { modeLabelKey } from '../utils/gameEngine';

import { t } from '../utils/i18n';
import { FlagImageSmall } from '../components/FlagImage';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import { getAllEarnedBadges, buildBadgeContext, deriveFromContext, BADGES, TIER_COLORS, getBadgeProgress, getBadgeName, getBadgeDescription, Badge } from '../utils/badges';
import { computeLevelProgress, LevelProgress, getTierLabel, getLevelTier } from '../utils/levels';
import { ChevronRightIcon, BadgeIconView, UsersIcon, CheckIcon, CrossIcon, FlameIcon, CopyIcon } from '../components/Icons';
import { hapticTap } from '../utils/feedback';
import { decodeChallenge } from '../utils/challengeCode';
import PageHeader from '../components/PageHeader';

const EMPTY_FLAG_STATS: FlagStats = {};
const toPct = (e: { correct: number; total: number } | undefined) =>
  e && e.total > 0 ? Math.round((e.correct / e.total) * 100) : null;
const TIME_ATTACK_CONFIG = { mode: 'timeattack' as const, category: 'all' as const, questionCount: UNLIMITED_QUESTIONS, timeLimit: TIMEATTACK_DEFAULT_TIME, displayMode: 'flag' as const };

// All async data the stats screen needs, loaded atomically.
interface StatsData {
  stats: UserStats;
  flagStats: FlagStats;
  dayStreakInfo: DayStreakInfo;
  badgeData: BadgeData;
  weakFlagCount: number;
  gameHistory: GameHistoryEntry[];
  challengeHistory: ChallengeHistoryEntry[];
  regionScoreHistory: RegionScoreHistory;
  persistedLevel: number;
  levelProgress: LevelProgress;
}

async function loadStatsData(): Promise<StatsData> {
  const [stats, flagStats, dayStreakInfo, badgeData, missed, gameHistory, challengeHistory, regionScoreHistory, persistedLevel] =
    await Promise.all([
      getStats(), getFlagStats(), getDayStreakInfo(), getBadgeData(),
      getMissedFlagIds(), getGameHistory(), getChallengeHistory(), getRegionScoreHistory(), getPersistedLevel(),
    ]);
  const lp = computeLevelProgress({ stats, flagStats, badgeData, dayStreakInfo }, persistedLevel);
  // Persist new high-water mark (fire-and-forget)
  persistLevel(lp.currentLevel);
  return { stats, flagStats, dayStreakInfo, badgeData, weakFlagCount: missed.length, gameHistory, challengeHistory, regionScoreHistory, persistedLevel, levelProgress: lp };
}

export default function StatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Stats'>>();
  const highlightChallenge = route.params?.highlightChallenge;
  const onNavigate = useNavTabs();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const RANK_COLORS = React.useMemo(() => [colors.rankGold, colors.textTertiary, colors.warning], [colors]);

  const [data, setData] = useState<StatsData | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeHistoryEntry | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── Animation values ──
  const hasAnimated = useRef(false);
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(12)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayAcc, setDisplayAcc] = useState(0);
  const progressFade = useRef(new Animated.Value(0)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const regionFade = useRef(new Animated.Value(0)).current;
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
      const shouldAnimate = !hasAnimated.current;

      loadStatsData().then((loaded) => {
        if (cancelled) return;
        setData(loaded);

        const acc = loaded.stats.totalAnswered > 0
          ? Math.round((loaded.stats.totalCorrect / loaded.stats.totalAnswered) * 100) : 0;
        const pct = loaded.levelProgress.target > 0 ? Math.min(loaded.levelProgress.progress / loaded.levelProgress.target, 1) : 0;

        if (shouldAnimate) {
          hasAnimated.current = true;
          heroFade.setValue(0);
          heroSlide.setValue(12);
          countAnim.setValue(0);
          setDisplayAcc(0);
          progressFade.setValue(0);
          progressBarAnim.setValue(0);
          regionFade.setValue(0);
          restFade.setValue(0);

          Animated.parallel([
            Animated.timing(heroFade, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(heroSlide, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
          ]).start();

          Animated.timing(countAnim, {
            toValue: acc, duration: 1000, delay: 200,
            easing: Easing.out(Easing.cubic), useNativeDriver: false,
          }).start();

          const progressDelay = 500;
          Animated.timing(progressFade, {
            toValue: 1, duration: 300, delay: progressDelay, useNativeDriver: true,
          }).start();
          Animated.timing(progressBarAnim, {
            toValue: pct, duration: 800, delay: progressDelay + 100,
            easing: Easing.out(Easing.cubic), useNativeDriver: false,
          }).start();
          Animated.timing(regionFade, {
            toValue: 1, duration: 300, delay: progressDelay + 300, useNativeDriver: true,
          }).start();
          Animated.timing(restFade, {
            toValue: 1, duration: 400, delay: progressDelay + 500, useNativeDriver: true,
          }).start();
        } else {
          heroFade.setValue(1);
          heroSlide.setValue(0);
          countAnim.setValue(acc);
          setDisplayAcc(acc);
          progressFade.setValue(1);
          progressBarAnim.setValue(pct);
          regionFade.setValue(1);
          restFade.setValue(1);
        }
      });

      return () => {
        cancelled = true;
        heroFade.stopAnimation();
        heroSlide.stopAnimation();
        countAnim.stopAnimation();
        progressFade.stopAnimation();
        progressBarAnim.stopAnimation();
        regionFade.stopAnimation();
        restFade.stopAnimation();
      };
    }, []),
  );

  // Auto-open challenge detail when navigated with highlightChallenge param
  React.useEffect(() => {
    if (highlightChallenge && data) {
      const match = data.challengeHistory.find((ch) => ch.shortCode === highlightChallenge);
      if (match) {
        setSelectedChallenge(match);
        // Clear the param so re-navigation with a different code works
        navigation.setParams({ highlightChallenge: undefined });
      }
    }
  }, [highlightChallenge, data, navigation]);

  const flagStats = data?.flagStats ?? EMPTY_FLAG_STATS;

  const top10 = React.useMemo(() => {
    return Object.entries(flagStats)
      .filter(([, s]) => s.right >= UNLOCK_THRESHOLD)
      .sort(([, a], [, b]) => {
        // Primary: most correct answers first
        if (a.right !== b.right) return b.right - a.right;
        // Tiebreaker: fastest average response time first
        const avgA = a.totalTimeRight && a.right > 0 ? a.totalTimeRight / a.right : Infinity;
        const avgB = b.totalTimeRight && b.right > 0 ? b.totalTimeRight / b.right : Infinity;
        return avgA - avgB;
      })
      .slice(0, 10);
  }, [flagStats]);

  const bottom10 = React.useMemo(() => {
    return Object.entries(flagStats)
      .filter(([, s]) => s.wrong > 0 && s.rightStreak < MASTERED_STREAK)
      .sort(([, a], [, b]) => {
        // Primary: most wrong answers first
        if (a.wrong !== b.wrong) return b.wrong - a.wrong;
        // Tiebreaker: slowest average wrong response time first (less confident)
        const avgA = a.totalTimeWrong && a.wrong > 0 ? a.totalTimeWrong / a.wrong : 0;
        const avgB = b.totalTimeWrong && b.wrong > 0 ? b.totalTimeWrong / b.wrong : 0;
        return avgB - avgA;
      })
      .slice(0, 10);
  }, [flagStats]);

  const badgeCtx = React.useMemo(() => {
    if (!data) return null;
    return buildBadgeContext(data.stats, data.flagStats, data.dayStreakInfo, data.badgeData, data.weakFlagCount);
  }, [data]);

  const derived = React.useMemo(() => {
    return badgeCtx ? deriveFromContext(badgeCtx) : null;
  }, [badgeCtx]);

  const earnedBadges = React.useMemo(() => {
    if (!badgeCtx || !data) return [];
    return getAllEarnedBadges(badgeCtx, data.badgeData.earnedBadgeIds);
  }, [badgeCtx, data]);

  const levelProgress = data?.levelProgress ?? null;

  const activityGrid = React.useMemo(() => {
    const gh = data?.gameHistory ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countMap = new Map<string, number>();
    for (const entry of gh) {
      countMap.set(entry.date, (countMap.get(entry.date) || 0) + 1);
    }

    // End on the most recent Friday (or today if Friday), start on Saturday 27 days before
    const endDate = new Date(today);
    const dayOfWeek = endDate.getDay(); // 0=Sun...6=Sat
    // Days since last Friday: Fri(5)=0, Sat(6)=1, Sun(0)=2, Mon(1)=3...
    const daysSinceFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
    endDate.setDate(endDate.getDate() - daysSinceFriday);

    const cells: { date: string; count: number; dayLabel: string }[] = [];
    // Sat, Sun, Mon, Tue, Wed, Thu, Fri
    const dayLabels = [
      t('stats.daySat'), t('stats.daySun'), t('stats.dayMon'),
      t('stats.dayTue'), t('stats.dayWed'), t('stats.dayThu'), t('stats.dayFri'),
    ];
    let hasActivity = false;
    // Start from Saturday (27 days before end Friday = 4 weeks, Sat to Fri)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 27);

    for (let i = 0; i < 28; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const count = countMap.get(dateStr) || 0;
      if (count > 0) hasActivity = true;
      cells.push({ date: dateStr, count, dayLabel: dayLabels[i % 7] });
    }

    const maxCount = Math.max(...cells.map((c) => c.count), 1);
    return { cells, maxCount, hasActivity };
  }, [data]);

  const distribution = React.useMemo(() => {
    const gh = data?.gameHistory ?? [];
    if (gh.length === 0) return null;
    const buckets = [
      { label: '90-100', min: 90, max: 100, count: 0 },
      { label: '70-89', min: 70, max: 89, count: 0 },
      { label: '50-69', min: 50, max: 69, count: 0 },
      { label: '0-49', min: 0, max: 49, count: 0 },
    ];
    for (const entry of gh) {
      for (const bucket of buckets) {
        if (entry.accuracy >= bucket.min && entry.accuracy <= bucket.max) {
          bucket.count++;
          break;
        }
      }
    }
    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, maxCount, total: gh.length };
  }, [data]);

  const sortedBadges = React.useMemo(() => {
    const earnedIdSet = new Set(earnedBadges.map((b) => b.id));
    return BADGES.map((badge) => {
      const earned = earnedIdSet.has(badge.id);
      const progress = !earned && badgeCtx && derived ? getBadgeProgress(badge, badgeCtx, derived) : null;
      const inProgress = !earned && progress != null && progress.progress > 0;
      const order = earned ? 0 : inProgress ? 1 : 2;
      return { badge, earned, progress, order };
    }).sort((a, b) => a.order - b.order);
  }, [earnedBadges, badgeCtx, derived]);

  // ── Loading gate: single check, all hooks above ──
  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Destructure for render (data is guaranteed non-null below) ──
  const { stats, challengeHistory, regionScoreHistory, dayStreakInfo } = data;

  // Region data - show all regions regardless of whether played
  const regionData = BASELINE_REGIONS.map((regionId) => {
    const scores = regionScoreHistory[regionId];
    return { id: regionId, scores };
  });

  const progressBarWidth = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenContainer>

        {/* ══════════════════════════════════════════════════════════
            HERO: 3-column stats card (games / accuracy / best in 60s)
            ══════════════════════════════════════════════════════════ */}
        <Animated.View style={[
          { opacity: heroFade, transform: [{ translateY: heroSlide }] },
        ]}>
          <View style={styles.headerRow}>
            <PageHeader title={t('stats.yourStats')} subtitle={t('stats.allTime')} />
            <View style={styles.streakBadge}>
              <FlameIcon size={16} color={dayStreakInfo.current > 0 ? colors.goldBright : colors.textTertiary} />
              <Text style={[styles.streakNum, dayStreakInfo.current === 0 && styles.streakNumInactive]}>{dayStreakInfo.current}</Text>
              <View style={styles.streakPips}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <View key={i} style={[styles.pip, i < Math.min(dayStreakInfo.current, 7) && styles.pipLit]} />
                ))}
              </View>
            </View>
          </View>
          <View style={styles.heroCard}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: colors.goldBright }]}>{stats.totalGamesPlayed}</Text>
              <Text style={styles.heroStatLabel}>{t('stats.gamesPlayedLabel')}</Text>
            </View>
            <View style={[styles.heroStatItem, styles.heroStatDivider]}>
              <Text style={[styles.heroStatValue, { color: colors.success }]}>{displayAcc}%</Text>
              <Text style={styles.heroStatLabel}>{t('stats.accuracy')}</Text>
            </View>
            <View style={[styles.heroStatItem, styles.heroStatDivider]}>
              {(stats.bestTimeAttackScore || 0) > 0 ? (
                <>
                  <Text style={styles.heroStatValue}>{stats.bestTimeAttackScore}</Text>
                  <Text style={styles.heroStatLabel}>{t('stats.bestIn60s')}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.heroStatValue, { color: colors.textTertiary }]}>-</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Game', { config: TIME_ATTACK_CONFIG })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.heroStatLabel, { color: colors.accent, textDecorationLine: 'underline' }]}>{t('stats.tryNow')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── LEVEL PROGRESS ── */}
        {levelProgress && (
        <Animated.View style={[styles.tileCompact, { opacity: progressFade }]}>
          <View style={styles.tileCompactRow}>
            <View>
              <Text style={styles.levelNumber}>{t('stats.level', { level: levelProgress.currentLevel })}</Text>
              <Text style={styles.levelTier}>{getTierLabel(getLevelTier(levelProgress.currentLevel || 1))}</Text>
            </View>
            {!levelProgress.isMaxLevel && (
              <Text style={styles.tileCompactVal}>{levelProgress.progress} / {levelProgress.target}</Text>
            )}
          </View>
          {!levelProgress.isMaxLevel && (
            <>
              <View style={styles.progressWrap}>
                <Animated.View style={[styles.progressFill, { width: progressBarWidth }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelBold}>{t('stats.nextGoal')}</Text>
                <Text style={styles.progressLabelMuted}>{t('stats.percentComplete', { pct: levelProgress.pct })}</Text>
              </View>
              <Text style={styles.levelGoalDesc}>{levelProgress.description}</Text>
            </>
          )}
          {levelProgress.isMaxLevel && (
            <Text style={styles.levelGoalDesc}>{t('stats.levelMaxed')}</Text>
          )}
        </Animated.View>
        )}

        {/* ── ACTIVITY HEATMAP (last 28 days, 7x4 grid) ── */}
        {activityGrid.hasActivity && (
          <Animated.View style={{ opacity: progressFade }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('stats.activityTitle')}</Text>
              <Text style={styles.sectionMeta}>{t('stats.last28Days')}</Text>
            </View>
            <View style={styles.heatmapCard}>
              <View style={styles.heatmapDayRow}>
                {activityGrid.cells.slice(0, 7).map((cell) => (
                  <Text key={`lbl-${cell.date}`} style={styles.heatmapDayLabel}>{cell.dayLabel}</Text>
                ))}
              </View>
              <View style={styles.heatmapGrid}>
                {activityGrid.cells.map((cell) => {
                  const level = cell.count === 0 ? 0
                    : cell.count <= activityGrid.maxCount * 0.25 ? 1
                    : cell.count <= activityGrid.maxCount * 0.5 ? 2
                    : cell.count <= activityGrid.maxCount * 0.75 ? 3
                    : 4;
                  return (
                    <View
                      key={cell.date}
                      style={[
                        styles.heatmapDot,
                        level === 1 && styles.heatmapL1,
                        level === 2 && styles.heatmapL2,
                        level === 3 && styles.heatmapL3,
                        level === 4 && styles.heatmapL4,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Best Timed Quiz, Next Milestone, and Practice Now removed */}

        {/* ══════════════════════════════════════════════════════════
            REGION SCORES: first / best / most recent per region
            ══════════════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: regionFade }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('categories.byRegion')}</Text>
          </View>

          <View style={styles.regionCards}>
            {regionData.map(({ id, scores }) => {
              const firstPct = toPct(scores?.first);
              const bestPct = toPct(scores?.best);
              const recentPct = toPct(scores?.mostRecent);
              const dash = t('stats.notPlayed');
              return (
                <View key={id} style={styles.regionScoreCard}>
                  <Text style={styles.regionScoreTitle}>{t(`categories.${id}`)}</Text>
                  <View style={styles.regionScoreRow}>
                    <View style={styles.regionScoreCol}>
                      <Text style={styles.regionScoreLabel}>{t('stats.firstScore')}</Text>
                      <Text style={[styles.regionScoreValue, firstPct === null && styles.regionScoreEmpty]}>{firstPct !== null ? `${firstPct}%` : dash}</Text>
                    </View>
                    <View style={[styles.regionScoreCol, styles.regionScoreColDivider]}>
                      <Text style={styles.regionScoreLabel}>{t('stats.bestScore')}</Text>
                      <Text style={[styles.regionScoreValue, bestPct !== null && bestPct >= GOOD_ACCURACY_PCT && { color: colors.success }, bestPct === null && styles.regionScoreEmpty]}>{bestPct !== null ? `${bestPct}%` : dash}</Text>
                    </View>
                    <View style={[styles.regionScoreCol, styles.regionScoreColDivider]}>
                      <Text style={styles.regionScoreLabel}>{t('stats.recentScore')}</Text>
                      <Text style={[styles.regionScoreValue, recentPct === null && styles.regionScoreEmpty]}>{recentPct !== null ? `${recentPct}%` : dash}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Game', {
                      config: { mode: 'medium', category: id as CategoryId, questionCount: getCategoryCount(id as CategoryId), displayMode: 'flag' },
                    })}
                    activeOpacity={0.7}
                    style={styles.regionRetakeLink}
                  >
                    <Text style={styles.regionRetakeLinkText}>{t('stats.takeTest')}</Text>
                    <ChevronRightIcon size={12} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── SCORE DISTRIBUTION ── */}
        {distribution && distribution.total >= 3 && (
          <Animated.View style={{ opacity: restFade }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('stats.scoreDistribution')}</Text>
              <Text style={styles.sectionMeta}>{t('results.gamesPlayed', { count: distribution.total })}</Text>
            </View>
            <View style={styles.distCard}>
              {distribution.buckets.map((bucket) => {
                const barPct = distribution.maxCount > 0
                  ? Math.max((bucket.count / distribution.maxCount) * 100, bucket.count > 0 ? 4 : 0)
                  : 0;
                const isGood = bucket.min >= GOOD_ACCURACY_PCT;
                return (
                  <View key={bucket.label} style={styles.distRow}>
                    <Text style={styles.distLabel}>{bucket.label}%</Text>
                    <View style={styles.distBarWrap}>
                      <View style={[
                        styles.distBarFill,
                        { width: `${barPct}%` },
                        isGood && styles.distBarGood,
                      ]} />
                    </View>
                    <Text style={[styles.distCount, isGood && styles.distCountGood]}>{bucket.count}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── RECENT CHALLENGES (clickable for detail) ── */}
        {challengeHistory.length > 0 && (
          <Animated.View style={{ opacity: restFade }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('challenge.recentChallenges')}</Text>
              <Text style={styles.sectionMeta}>{t('challenge.last10')}</Text>
            </View>
            <View style={styles.challengeList}>
              {challengeHistory.map((ch, i) => {
                const oppCount = ch.opponents?.length ?? (ch.opponentName !== null && ch.opponentScore !== null ? 1 : 0);
                const hasOpponent = oppCount > 0;
                const isSingleOpponent = oppCount === 1;
                const won = isSingleOpponent && ch.myScore > ch.opponentScore!;
                const lost = isSingleOpponent && ch.myScore < ch.opponentScore!;
                const dateStr = new Date(ch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <TouchableOpacity
                    key={`${ch.shortCode}-${ch.direction}-${i}`}
                    style={styles.challengeRow}
                    activeOpacity={0.7}
                    onPress={() => setSelectedChallenge(ch)}
                  >
                    <View style={[
                      styles.challengeIconWrap,
                      won ? { backgroundColor: colors.successBg } :
                      lost ? { backgroundColor: colors.errorBg } :
                      { backgroundColor: colors.surfaceSecondary },
                    ]}>
                      <UsersIcon size={16} color={won ? colors.success : lost ? colors.error : colors.textTertiary} />
                    </View>
                    <View style={styles.challengeContent}>
                      <View style={styles.challengeTopRow}>
                        <Text style={styles.challengeCode}>{ch.shortCode}</Text>
                        <Text style={styles.challengeDate}>{dateStr}</Text>
                      </View>
                      <Text style={styles.challengeMode}>{t(modeLabelKey(ch.mode))}</Text>
                      <View style={styles.challengeScoreRow}>
                        <Text style={styles.challengeScoreLabel}>{t('challenge.you')}:</Text>
                        <Text style={[styles.challengeScore, won && { color: colors.success }]}>
                          {ch.myScore}/{ch.totalFlags}
                        </Text>
                        {oppCount > 1 && ch.direction === 'sent' && (
                          <Text style={styles.challengeOpponentCount}>
                            {t('challenge.opponentCount', { count: oppCount })}
                          </Text>
                        )}
                      </View>
                    </View>
                    <ChevronRightIcon size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── BADGES (clickable for detail) ── */}
        <Animated.View style={{ opacity: restFade }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('stats.badges')}</Text>
            <Text style={styles.sectionMeta}>{t('stats.badgesEarned', { earned: earnedBadges.length, total: BADGES.length })}</Text>
          </View>
          <View style={styles.badgeGrid}>
            {sortedBadges.map(({ badge, earned, progress }) => {
              const tierColor = TIER_COLORS[badge.tier];
              return (
                <TouchableOpacity
                  key={badge.id}
                  style={[styles.badgeCard, !earned && styles.badgeCardLocked]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedBadge(badge)}
                >
                  <View style={[styles.badgeIconWrap, { backgroundColor: earned ? tierColor + '18' : colors.surfaceSecondary }]}>
                    <BadgeIconView icon={badge.icon} size={14} color={earned ? tierColor : colors.textTertiary} />
                  </View>
                  <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={1}>{getBadgeName(badge)}</Text>
                  {progress && progress.progress > 0 && (
                    <View style={styles.badgeProgressWrap}>
                      <View style={[styles.badgeProgressFill, { width: `${progress.pct}%` }]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── TOP 10 ── */}
        {top10.length > 0 && (
          <Animated.View style={{ opacity: restFade }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('stats.bestFlags')}</Text>
              <Text style={styles.sectionMeta}>{t('stats.alwaysRight')}</Text>
            </View>
            {top10.map(([id, fs], i) => {
              const totalSeen = fs.right + fs.wrong;
              const avgTime = fs.totalTimeRight && fs.right > 0 ? (fs.totalTimeRight / fs.right / 1000).toFixed(1) : null;
              return (
                <View key={id} style={styles.rankRow}>
                  <Text style={[styles.rank, i < 3 && { color: RANK_COLORS[i] }]}>{i + 1}</Text>
                  <FlagImageSmall countryCode={id} />
                  <Text style={styles.rankName}>{flagNameMap[id] || id}</Text>
                  {avgTime && <Text style={styles.rankSpeed}>{avgTime}s</Text>}
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>{fs.right}/{totalSeen}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* ── BOTTOM 10 ── */}
        {bottom10.length > 0 && (
          <Animated.View style={{ opacity: restFade }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('stats.weakFlags')}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Game', {
                  config: { mode: 'practice', category: 'all', questionCount: data.weakFlagCount, displayMode: 'flag' },
                })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('stats.practiceThese')}
              >
                <Text style={[styles.sectionMeta, { color: colors.accent, textDecorationLine: 'underline' }]}>{t('stats.practiceThese')}</Text>
              </TouchableOpacity>
            </View>
            {bottom10.map(([id, fs], i) => {
              const totalSeen = fs.right + fs.wrong;
              return (
                <View key={id} style={styles.rankRow}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <FlagImageSmall countryCode={id} />
                  <Text style={styles.rankName}>{flagNameMap[id] || id}</Text>
                  <View style={[styles.scoreBadge, styles.scoreBadgeWrong]}>
                    <Text style={[styles.scoreBadgeText, styles.scoreBadgeTextWrong]}>{fs.right}/{totalSeen}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View style={{ opacity: restFade }}>
          <TouchableOpacity
            style={styles.settingsLink}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('app.settings')}
            accessibilityHint={t('app.settings')}
          >
            <Text style={styles.settingsLinkText}>{t('app.settings')}</Text>
            <ChevronRightIcon size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Stats" onNavigate={onNavigate} />

      {/* ── Badge Detail Modal ── */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {selectedBadge && (() => {
              const isEarned = earnedBadges.some((b) => b.id === selectedBadge.id);
              const tierColor = TIER_COLORS[selectedBadge.tier];
              const bp = !isEarned && badgeCtx && derived ? getBadgeProgress(selectedBadge, badgeCtx, derived) : null;
              const inProgress = bp && bp.progress > 0;
              return (
                <>
                  <View style={[styles.modalBadgeIcon, { backgroundColor: tierColor + '18' }]}>
                    <BadgeIconView icon={selectedBadge.icon} size={28} color={isEarned ? tierColor : colors.textTertiary} />
                  </View>
                  <Text style={styles.modalBadgeName}>{getBadgeName(selectedBadge)}</Text>
                  <Text style={styles.modalBadgeDesc}>{getBadgeDescription(selectedBadge)}</Text>
                  <View style={[styles.modalStatusPill, {
                    backgroundColor: isEarned ? colors.successBg : inProgress ? colors.warningBg : colors.surfaceSecondary,
                  }]}>
                    <Text style={[styles.modalStatusText, {
                      color: isEarned ? colors.success : inProgress ? colors.warning : colors.textTertiary,
                    }]}>
                      {isEarned
                        ? t('stats.badgeDetailEarned')
                        : inProgress
                        ? t('stats.badgeDetailProgress', { progress: bp!.progress, target: bp!.target })
                        : t('stats.badgeDetailLocked')}
                    </Text>
                  </View>
                  {inProgress && (
                    <View style={styles.modalProgressWrap}>
                      <View style={[styles.modalProgressFill, { width: `${bp!.pct}%` }]} />
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Challenge Detail Modal (Head to Head) ── */}
      <Modal
        visible={selectedChallenge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { setSelectedChallenge(null); setCodeCopied(false); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setSelectedChallenge(null); setCodeCopied(false); }}
        >
          <View style={[styles.modalCard, { maxHeight: '80%' }]} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {selectedChallenge && (() => {
              const ch = selectedChallenge;
              // Reconstruct myResults from fullCode if missing (older challenge data)
              let myResults = ch.myResults;
              if (!myResults && ch.fullCode && ch.direction === 'sent') {
                const decoded = decodeChallenge(ch.fullCode);
                if (decoded.status === 'ok') {
                  myResults = decoded.data.hostResults.map((r) => r.correct);
                }
              }
              // Build opponents list: prefer opponents array, fall back to legacy fields
              const opponents = ch.opponents && ch.opponents.length > 0
                ? ch.opponents
                : ch.opponentName !== null && ch.opponentScore !== null
                  ? [{ name: ch.opponentName!, score: ch.opponentScore!, results: ch.opponentResults, date: ch.date }]
                  : [];
              const hasOpponent = opponents.length > 0;
              const isMulti = opponents.length > 1;
              // For single-opponent: use legacy win/lose logic
              const won = hasOpponent && !isMulti && ch.myScore > opponents[0].score;
              const lost = hasOpponent && !isMulti && ch.myScore < opponents[0].score;
              const tied = hasOpponent && !isMulti && ch.myScore === opponents[0].score;
              const dateStr = new Date(ch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <>
                  <Text style={styles.modalTitle}>{t('challenge.headToHead')}</Text>
                  <Text style={[styles.modalSubtitle, { marginBottom: spacing.md }]}>{t(modeLabelKey(ch.mode))} - {dateStr}</Text>

                  {isMulti ? (() => {
                    const sorted = [
                      { name: ch.myName || t('challenge.you'), score: ch.myScore, isMe: true },
                      ...opponents.map((o) => ({ name: o.name, score: o.score, isMe: false })),
                    ].sort((a, b) => b.score - a.score);
                    return (
                      <View style={styles.multiOpponentList}>
                        {sorted.map((entry, idx) => {
                          // Tied scores share the same rank
                          const rank = idx === 0 || sorted[idx - 1].score !== entry.score ? idx + 1 : 0;
                          return (
                            <View key={`${entry.name}-${idx}`} style={[
                              styles.multiOpponentRow,
                              idx % 2 === 0 && { backgroundColor: colors.surfaceSecondary + '40' },
                            ]}>
                              <Text style={styles.multiOpponentRank}>{rank > 0 ? rank : ''}</Text>
                              <Text style={[styles.multiOpponentName, { flex: 1 }]} numberOfLines={1}>
                                {entry.name}
                              </Text>
                              <Text style={[
                                styles.multiOpponentScore,
                                entry.isMe && { color: colors.goldBright },
                              ]}>
                                {entry.score}/{ch.totalFlags}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })() : hasOpponent ? (
                    <View style={styles.h2hContainer}>
                      <View style={styles.h2hColumn}>
                        <Text style={styles.h2hName}>{ch.myName || t('challenge.you')}</Text>
                        <Text style={[styles.h2hScore, won && { color: colors.success }]}>{ch.myScore}/{ch.totalFlags}</Text>
                      </View>
                      <Text style={styles.h2hVs}>{t('common.vs')}</Text>
                      <View style={styles.h2hColumn}>
                        <Text style={styles.h2hName}>{opponents[0].name}</Text>
                        <Text style={[styles.h2hScore, lost && { color: colors.error }]}>{opponents[0].score}/{ch.totalFlags}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.h2hContainer}>
                      <View style={styles.h2hColumn}>
                        <Text style={styles.h2hName}>{ch.myName || t('challenge.you')}</Text>
                        <Text style={styles.h2hScore}>{ch.myScore}/{ch.totalFlags}</Text>
                      </View>
                    </View>
                  )}

                  {!isMulti && (
                    <View style={[styles.modalStatusPill, {
                      backgroundColor: won ? colors.successBg : lost ? colors.errorBg : colors.surfaceSecondary,
                      marginTop: spacing.md,
                    }]}>
                      <Text style={[styles.modalStatusText, {
                        color: won ? colors.success : lost ? colors.error : colors.textTertiary,
                      }]}>
                        {won ? t('challenge.youWin')
                          : lost ? t('challenge.theyWin', { name: opponents[0]?.name || '' })
                          : tied ? t('challenge.tie')
                          : `${ch.myScore}/${ch.totalFlags}`}
                      </Text>
                    </View>
                  )}

                  {/* Per-question result details (single opponent only) */}
                  {!isMulti && (myResults || ch.opponentResults) && (
                    <View style={styles.h2hDetailsWrap}>
                      <View style={styles.h2hDetailsHeader}>
                        <Text style={[styles.h2hDetailsLabel, { flex: hasOpponent ? 1 : 0 }]}>{ch.myName || t('challenge.you')}</Text>
                        <Text style={[styles.h2hDetailsLabel, { width: 28, textAlign: 'center' }]}>#</Text>
                        {hasOpponent && <Text style={[styles.h2hDetailsLabel, { flex: 1, textAlign: 'right' }]}>{opponents[0].name}</Text>}
                      </View>
                      {Array.from({ length: ch.totalFlags }).map((_, qi) => {
                        const myOk = myResults ? myResults[qi] : undefined;
                        const oppResults = opponents[0]?.results;
                        const oppOk = oppResults ? oppResults[qi] : undefined;
                        const myWon = myOk === true && oppOk === false;
                        const oppWon = oppOk === true && myOk === false;
                        return (
                          <View key={qi} style={[styles.h2hDetailsRow, qi % 2 === 0 && { backgroundColor: colors.surfaceSecondary + '40' }]}>
                            <View style={hasOpponent ? styles.h2hDetailsSide : undefined}>
                              {myOk === undefined ? (
                                <View style={[styles.h2hDot, { backgroundColor: colors.surfaceSecondary }]} />
                              ) : myOk ? (
                                <CheckIcon size={14} color={myWon ? colors.success : colors.success + '90'} />
                              ) : (
                                <CrossIcon size={14} color={colors.error + (oppWon ? 'FF' : '90')} />
                              )}
                            </View>
                            <Text style={styles.h2hDetailsQ}>{qi + 1}</Text>
                            {hasOpponent && (
                              <View style={[styles.h2hDetailsSide, { alignItems: 'flex-end' }]}>
                                {oppOk === undefined ? (
                                  <View style={[styles.h2hDot, { backgroundColor: colors.surfaceSecondary }]} />
                                ) : oppOk ? (
                                  <CheckIcon size={14} color={oppWon ? colors.success : colors.success + '90'} />
                                ) : (
                                  <CrossIcon size={14} color={colors.error + (myWon ? 'FF' : '90')} />
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {ch.fullCode ? (
                    <TouchableOpacity
                      style={[styles.copyCodeBtn, codeCopied && styles.copyCodeBtnCopied]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('challenge.copyCode')}
                      onPress={async () => {
                        hapticTap();
                        try {
                          await Clipboard.setStringAsync(ch.fullCode);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        } catch { /* clipboard unavailable on some platforms */ }
                      }}
                    >
                      {codeCopied ? (
                        <CheckIcon size={14} color={colors.success} />
                      ) : (
                        <CopyIcon size={14} color={colors.textSecondary} />
                      )}
                      <Text style={[styles.copyCodeText, codeCopied && styles.copyCodeTextCopied]}>
                        {codeCopied ? t('challenge.codeCopied') : t('challenge.copyCode')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              );
            })()}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.textSecondary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // ── Header row with streak badge
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  streakNum: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: colors.goldBright,
    letterSpacing: -0.8,
    lineHeight: 22,
  },
  streakNumInactive: {
    color: colors.textTertiary,
  },
  streakPips: {
    flexDirection: 'row',
    gap: 3,
    marginLeft: 2,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pipInactive,
  },
  pipLit: {
    backgroundColor: colors.pipActive,
  },

  // ── Hero (3-column stats card)
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  heroStatValue: {
    ...typography.statValue,
    color: colors.ink,
    lineHeight: 26,
    marginBottom: 2,
  },
  heroStatLabel: {
    ...typography.eyebrow,
    color: colors.textTertiary,
  },

  // ── Tiles
  tileCompact: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.sm,
  },
  tileCompactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileCompactVal: {
    ...typography.bodyBold,
    color: colors.ink,
  },
  levelNumber: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: colors.goldBright,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  levelTier: {
    ...typography.micro,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  levelGoalDesc: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
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
    ...typography.microBold,
    color: colors.ink,
  },
  progressLabelMuted: {
    ...typography.micro,
    color: colors.textTertiary,
  },

  // ── Region Cards
  regionCards: {
    gap: spacing.sm,
  },

  // ── Section
  sectionTitle: {
    ...typography.eyebrow,
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
    ...typography.micro,
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
    ...typography.statValue,
    color: colors.textTertiary,
    minWidth: 20,
    textAlign: 'center',
  },
  rankName: {
    ...typography.label,
    color: colors.ink,
    flex: 1,
  },
  rankSpeed: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  scoreBadge: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  scoreBadgeText: {
    ...typography.tag,
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
    ...typography.microMedium,
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
    ...typography.tag,
    color: colors.textTertiary,
    width: 24,
    textAlign: 'right',
  },
  distCountGood: {
    color: colors.success,
  },

  // ── Challenges
  challengeList: {
    gap: 6,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  challengeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeContent: {
    flex: 1,
  },
  challengeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  challengeCode: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  challengeDate: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  challengeMode: {
    ...typography.micro,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  challengeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeScoreLabel: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  challengeScore: {
    ...typography.microBold,
    color: colors.ink,
  },
  challengeOpponentCount: {
    ...typography.micro,
    color: colors.goldBright,
    marginLeft: spacing.xs,
  },

  // ── Multi-opponent leaderboard
  multiOpponentList: {
    gap: spacing.xxs,
  },
  multiOpponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  multiOpponentRank: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    width: 20,
    textAlign: 'center',
  },
  multiOpponentName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  multiOpponentScore: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.sm,
    color: colors.ink,
  },

  // ── Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  badgeCard: {
    width: '23%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    alignItems: 'center',
  },
  badgeCardLocked: { opacity: 0.45 },
  badgeIconWrap: {
    width: 28, height: 28, borderRadius: borderRadius.sm,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  badgeName: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xs,
    color: colors.ink,
    textAlign: 'center',
  },
  badgeNameLocked: { color: colors.textTertiary },
  badgeProgressWrap: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: 5,
    width: '100%',
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
  },

  // ── Activity Heatmap (wider ovals, full-width)
  heatmapCard: {
    flexDirection: 'column',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  heatmapDayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  heatmapDayLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.micro,
    fontFamily: fontFamily.uiLabel,
    lineHeight: 14,
    color: colors.textTertiary,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  heatmapDot: {
    // ~14.28% minus gap share = approx 1/7th of row
    flexBasis: '12.5%',
    flexGrow: 1,
    height: 14,
    borderRadius: 5,
    backgroundColor: colors.surfaceSecondary,
  },
  heatmapL1: {
    backgroundColor: colors.goldBright + '40',
  },
  heatmapL2: {
    backgroundColor: colors.goldBright + '73',
  },
  heatmapL3: {
    backgroundColor: colors.goldBright + 'B3',
  },
  heatmapL4: {
    backgroundColor: colors.goldBright,
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
    ...typography.label,
    color: colors.textTertiary,
  },

  // ── Region Score Cards
  regionScoreCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  regionScoreTitle: {
    ...typography.captionStrong,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  regionScoreRow: {
    flexDirection: 'row',
  },
  regionScoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  regionScoreColDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  regionScoreLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  regionScoreValue: {
    ...typography.statValue,
    color: colors.ink,
  },
  regionScoreEmpty: {
    color: colors.textTertiary,
  },
  regionRetakeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  regionRetakeLinkText: {
    ...typography.captionStrong,
    color: colors.accent,
  },

  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.title,
    color: colors.ink,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  modalBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalBadgeName: {
    ...typography.bodyBold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalBadgeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalStatusPill: {
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  modalStatusText: {
    ...typography.captionStrong,
    textAlign: 'center',
  },
  modalProgressWrap: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    width: '100%',
    marginTop: spacing.sm,
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
  },

  // ── Head to Head
  h2hContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  h2hColumn: {
    flex: 1,
    alignItems: 'center',
  },
  h2hName: {
    ...typography.captionStrong,
    color: colors.ink,
    marginBottom: 4,
  },
  h2hScore: {
    ...typography.statValue,
    color: colors.ink,
    fontSize: fontSize.lg,
  },
  h2hVs: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  h2hDetailsWrap: {
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  h2hDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  h2hDetailsLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  h2hDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  h2hDetailsSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  h2hDetailsQ: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    width: 28,
  },
  h2hDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  copyCodeText: {
    ...typography.captionStrong,
    color: colors.textSecondary,
  },
  copyCodeBtnCopied: {
    backgroundColor: colors.successBg,
  },
  copyCodeTextCopied: {
    color: colors.success,
  },
});
