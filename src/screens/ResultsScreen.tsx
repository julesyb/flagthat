import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, buttons, borderRadius } from '../utils/theme';
import { calculateAccuracy, getStreakFromResults, getGrade, generateDailyShareGrid, getDailyNumber } from '../utils/gameEngine';
import { updateStats, updateFlagResults, saveDailyChallenge, incrementDailyChallenges, updateLastGameBadgeFlags, markShared, getStats, getFlagStats, getDayStreak, getBadgeData, getMissedFlagIds } from '../utils/storage';
import { t } from '../utils/i18n';
import { hapticCorrect, playCelebrationSound } from '../utils/feedback';
import { FlagImageSmall } from '../components/FlagImage';
import { CheckIcon, CrossIcon, ChevronRightIcon, BarChartIcon, FlagIcon, GlobeIcon, PlayIcon, LightningIcon, CalendarIcon, ClockIcon, CrosshairIcon, LinkIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import { UserStats } from '../types';
import { RootStackParamList } from '../types/navigation';
import { evaluateBadges, BADGES, TIER_COLORS, BadgeIcon, EarnedBadge } from '../utils/badges';
import { getTotalFlagCount } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export default function ResultsScreen({ route, navigation }: Props) {
  const { results, config, reviewOnly } = route.params;
  const correct = results.filter((r) => r.correct).length;
  const accuracy = calculateAccuracy(results);
  const streak = getStreakFromResults(results);
  const grade = getGrade(accuracy);
  const avgTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.timeTaken, 0) / results.length / 1000 * 10) / 10
    : 0;
  const isPerfect = accuracy === 100 && results.length > 0;

  const gradeScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const reviewAnims = useRef(results.map(() => new Animated.Value(0))).current;

  const isDaily = config.mode === 'daily';

  // Progress data
  const [overallStats, setOverallStats] = useState<UserStats | null>(null);
  const [countriesSeen, setCountriesSeen] = useState(0);
  const [totalFlags, setTotalFlags] = useState(0);
  const [dayStreakCount, setDayStreakCount] = useState(0);
  const [newBadges, setNewBadges] = useState<EarnedBadge[]>([]);
  const [totalBadgesEarned, setTotalBadgesEarned] = useState(0);
  const [isNewBestStreak, setIsNewBestStreak] = useState(false);

  useEffect(() => {
    async function processResults() {
      // Snapshot pre-game badges
      const [preStats, preFlagStats, preDayStreak, preBadgeData, preMissed] = await Promise.all([
        getStats(), getFlagStats(), getDayStreak(), getBadgeData(), getMissedFlagIds(),
      ]);
      const preBadgeIds = new Set(evaluateBadges({
        stats: preStats,
        flagStats: preFlagStats,
        dayStreak: preDayStreak,
        dailyChallengesCompleted: preBadgeData.dailyChallengesCompleted,
        hasShared: preBadgeData.hasShared,
        lastGamePerfect10: preBadgeData.lastGamePerfect10,
        lastGameSRank: preBadgeData.lastGameSRank,
        weakFlagCount: preMissed.length,
      }).map((b) => b.id));

      const wasNewBestStreak = streak > preStats.bestStreak;

      // Update stats
      if (!reviewOnly) {
        await updateStats(correct, results.length, streak, config.mode, config.category);
        await updateFlagResults(results);
        await updateLastGameBadgeFlags(correct, results.length);
        if (isDaily) {
          await saveDailyChallenge(results);
          await incrementDailyChallenges();
        }
      }

      // Load post-game state
      const [postStats, postFlagStats, postDayStreak, postBadgeData, postMissed] = await Promise.all([
        getStats(), getFlagStats(), getDayStreak(), getBadgeData(), getMissedFlagIds(),
      ]);

      const postBadges = evaluateBadges({
        stats: postStats,
        flagStats: postFlagStats,
        dayStreak: postDayStreak,
        dailyChallengesCompleted: postBadgeData.dailyChallengesCompleted,
        hasShared: postBadgeData.hasShared,
        lastGamePerfect10: postBadgeData.lastGamePerfect10,
        lastGameSRank: postBadgeData.lastGameSRank,
        weakFlagCount: postMissed.length,
      });

      const newly = postBadges.filter((b) => !preBadgeIds.has(b.id));

      setOverallStats(postStats);
      setDayStreakCount(postDayStreak);
      setTotalFlags(getTotalFlagCount());
      setCountriesSeen(Object.values(postFlagStats).filter((fs) => fs.right > 0).length);
      setNewBadges(newly);
      setTotalBadgesEarned(postBadges.length);
      setIsNewBestStreak(wasNewBestStreak && !reviewOnly);
    }

    processResults();

    // Animations
    Animated.spring(gradeScale, {
      toValue: 1,
      friction: 4,
      tension: 80,
      delay: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(statsOpacity, {
      toValue: 1,
      duration: 400,
      delay: 500,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressOpacity, {
      toValue: 1,
      duration: 400,
      delay: 700,
      useNativeDriver: true,
    }).start();

    // Stagger review items
    Animated.stagger(
      60,
      reviewAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 300, delay: 900, useNativeDriver: true }),
      ),
    ).start();

    if (isPerfect) {
      hapticCorrect();
      playCelebrationSound();
      const loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(confettiOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(confettiOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ]),
      );
      loopAnim.start();
      return () => { loopAnim.stop(); };
    }
  }, []);

  const categoryLabel = config.category === 'all'
    ? t('categories.all')
    : t(`categories.${config.category}`);
  const modeLabel = t(`modes.${config.mode}`);

  const handleShare = async () => {
    const message = isDaily
      ? generateDailyShareGrid(results)
      : `Flag That\n` +
        `${modeLabel} - ${categoryLabel}\n` +
        `Score: ${correct}/${results.length} (${accuracy}%)\n` +
        `Grade: ${grade.label} | Streak: ${streak}\n` +
        (isPerfect ? t('results.perfectShareNote') + '\n' : '') +
        t('results.shareFooter');

    try {
      await Share.share({ message });
      markShared();
    } catch {
      // Share cancelled
    }
  };

  const dailyNumber = isDaily ? getDailyNumber() : 0;
  const goHome = () => navigation.popToTop();

  const playAgain = () => {
    if (isDaily) { navigation.popToTop(); return; }
    if (config.mode === 'flagflash') navigation.replace('FlagFlash', { config });
    else if (config.mode === 'flagpuzzle') navigation.replace('FlagPuzzle', { config });
    else if (config.mode === 'neighbors') navigation.replace('Neighbors', { config });
    else if (config.mode === 'impostor') navigation.replace('FlagImpostor', { config });
    else if (config.mode === 'capitalconnection') navigation.replace('CapitalConnection', { config });
    else navigation.replace('Game', { config });
  };

  const progressPct = totalFlags > 0 ? Math.round((countriesSeen / totalFlags) * 100) : 0;

  const renderBadgeIcon = (icon: BadgeIcon, tierColor: string) => {
    const size = 18;
    switch (icon) {
      case 'flag': return <FlagIcon size={size} color={tierColor} />;
      case 'globe': return <GlobeIcon size={size} color={tierColor} />;
      case 'check': return <CheckIcon size={size} color={tierColor} />;
      case 'play': return <PlayIcon size={size} color={tierColor} />;
      case 'lightning': return <LightningIcon size={size} color={tierColor} />;
      case 'calendar': return <CalendarIcon size={size} color={tierColor} />;
      case 'clock': return <ClockIcon size={size} color={tierColor} />;
      case 'crosshair': return <CrosshairIcon size={size} color={tierColor} />;
      case 'link': return <LinkIcon size={size} color={tierColor} />;
      default: return <FlagIcon size={size} color={tierColor} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PERFECT SCORE BANNER ── */}
        {isPerfect && (
          <Animated.View style={[styles.celebrationBanner, { opacity: confettiOpacity }]}>
            <Text style={styles.celebrationText}>{t('results.perfectScore')}</Text>
          </Animated.View>
        )}

        {/* ── HERO GRADE CARD ── */}
        <Animated.View
          style={[
            styles.heroCard,
            { transform: [{ scale: gradeScale }] },
          ]}
        >
          <Text style={styles.heroModeLabel}>
            {isDaily ? t('results.dailyTitle', { number: dailyNumber }) : `${modeLabel} / ${categoryLabel}`}
          </Text>
          <Text style={[styles.heroGrade, { color: grade.color }]}>{grade.label}</Text>
          <View style={styles.heroScoreRow}>
            <Text style={styles.heroAccuracy}>{accuracy}%</Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroScore}>{correct}/{results.length}</Text>
          </View>
        </Animated.View>

        {/* ── DAILY GRID ── */}
        {isDaily && (
          <View style={styles.dailyGridCard}>
            <Text style={styles.dailyGridTitle}>{t('results.shareTitle', { number: dailyNumber })}</Text>
            <View style={styles.dailyGrid}>
              <View style={styles.dailyGridRow}>
                {results.slice(0, 5).map((r, i) => (
                  <View key={i} style={[styles.dailyCell, r.correct ? styles.dailyCellCorrect : styles.dailyCellWrong]} />
                ))}
              </View>
              <View style={styles.dailyGridRow}>
                {results.slice(5, 10).map((r, i) => (
                  <View key={i} style={[styles.dailyCell, r.correct ? styles.dailyCellCorrect : styles.dailyCellWrong]} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── STAT TILES ── */}
        <Animated.View style={[styles.statsRow, { opacity: statsOpacity }]}>
          <View style={styles.statTile}>
            <Text style={styles.statTileValue}>{streak}</Text>
            <Text style={styles.statTileLabel}>{t('results.bestStreak')}</Text>
            {isNewBestStreak && (
              <View style={styles.newBestBadge}>
                <Text style={styles.newBestText}>{t('results.newBest')}</Text>
              </View>
            )}
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statTileValue}>{avgTime}<Text style={styles.statTileUnit}>s</Text></Text>
            <Text style={styles.statTileLabel}>{t('results.avgTime')}</Text>
          </View>
        </Animated.View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleShare}
            activeOpacity={0.7}
            accessibilityLabel={t('common.share')}
          >
            <Text style={styles.secondaryButtonText}>{t('common.share')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={playAgain}
            activeOpacity={0.7}
            accessibilityLabel={t('common.play')}
          >
            <Text style={styles.primaryButtonText}>{isDaily ? t('common.home') : t('common.play')}</Text>
          </TouchableOpacity>
          {!isDaily && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={goHome}
              activeOpacity={0.7}
              accessibilityLabel={t('common.home')}
            >
              <Text style={styles.secondaryButtonText}>{t('common.home')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── NEWLY EARNED BADGES ── */}
        {newBadges.length > 0 && (
          <View style={styles.badgesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('results.badgesUnlocked')}</Text>
              <Text style={styles.sectionMeta}>
                {t('stats.badgesEarned', { earned: totalBadgesEarned, total: BADGES.length })}
              </Text>
            </View>
            {newBadges.map((badge) => {
              const tierColor = TIER_COLORS[badge.tier];
              return (
                <View key={badge.id} style={styles.badgeRow}>
                  <View style={[styles.badgeIconWrap, { backgroundColor: tierColor + '18' }]}>
                    {renderBadgeIcon(badge.icon, tierColor)}
                  </View>
                  <View style={styles.badgeContent}>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDesc}>{badge.description}</Text>
                  </View>
                  <View style={[styles.badgeTierPill, { backgroundColor: tierColor + '18' }]}>
                    <Text style={[styles.badgeTierText, { color: tierColor }]}>{badge.tier}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── YOUR PROGRESS ── */}
        {overallStats && !reviewOnly && (
          <Animated.View style={[styles.progressSection, { opacity: progressOpacity }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('results.yourProgress')}</Text>
            </View>
            <View style={styles.progressCard}>
              <View style={styles.progressTopRow}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{countriesSeen}</Text>
                  <Text style={styles.progressStatLabel}>
                    {t('stats.countriesOf', { seen: countriesSeen, total: totalFlags })}
                  </Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{overallStats.totalGamesPlayed}</Text>
                  <Text style={styles.progressStatLabel}>{t('stats.gamesPlayed')}</Text>
                </View>
                {dayStreakCount > 0 && (
                  <View style={styles.progressStat}>
                    <Text style={styles.progressStatValue}>{dayStreakCount}</Text>
                    <Text style={styles.progressStatLabel}>{t('stats.dayStreak')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.progressBarWrap}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressPctLabel}>
                {t('stats.percentComplete', { pct: progressPct })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewStatsButton}
              onPress={() => navigation.navigate('Stats')}
              activeOpacity={0.7}
            >
              <BarChartIcon size={16} color={colors.ink} />
              <Text style={styles.viewStatsText}>{t('results.viewAllStats')}</Text>
              <ChevronRightIcon size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── REVIEW ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('common.review')}</Text>
          <Text style={styles.sectionMeta}>{correct}/{results.length} {t('results.correct').toLowerCase()}</Text>
        </View>
        {results.map((result, index) => {
          const itemTime = Math.round(result.timeTaken / 100) / 10;
          return (
            <Animated.View
              key={index}
              style={[
                styles.reviewItem,
                result.correct ? styles.reviewCorrect : styles.reviewWrong,
                {
                  opacity: reviewAnims[index],
                  transform: [{
                    translateY: reviewAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  }],
                },
              ]}
            >
              <Text style={[styles.reviewIndex, result.correct ? styles.reviewIndexCorrect : styles.reviewIndexWrong]}>
                {index + 1}
              </Text>
              <FlagImageSmall
                countryCode={result.question.flag.id}
                emoji={result.question.flag.emoji}
              />
              <View style={styles.reviewContent}>
                <Text style={styles.reviewName}>{result.question.flag.name}</Text>
                {!result.correct && result.userAnswer !== 'SKIPPED' && (
                  <Text style={styles.reviewAnswer}>
                    {t('results.youSaid', { answer: result.userAnswer })}
                  </Text>
                )}
                {result.userAnswer === 'SKIPPED' && (
                  <Text style={styles.reviewAnswer}>{t('results.skipped')}</Text>
                )}
              </View>
              <View style={styles.reviewRight}>
                <Text style={styles.reviewTime}>{itemTime}s</Text>
                {result.correct
                  ? <CheckIcon size={18} color={colors.success} />
                  : <CrossIcon size={18} color={colors.error} />
                }
              </View>
            </Animated.View>
          );
        })}

        {/* ── BOTTOM SPACER ── */}
        <View style={{ height: spacing.lg }} />
      </ScrollView>
      <BottomNav
        activeTab="Play"
        onNavigate={(tab) => {
          if (tab === 'Play') navigation.popToTop();
          else if (tab === 'Modes') navigation.navigate('GameSetup');
          else if (tab === 'Stats') navigation.navigate('Stats');
          else if (tab === 'Browse') navigation.navigate('Browse');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // ── Celebration
  celebrationBanner: {
    backgroundColor: colors.warning,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  celebrationText: {
    ...typography.headingUpper,
    color: colors.primary,
  },

  // ── Hero Grade Card
  heroCard: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroModeLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.whiteAlpha45,
    marginBottom: spacing.sm,
  },
  heroGrade: {
    fontSize: fontSize.grade,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroAccuracy: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.title,
    color: colors.white,
    letterSpacing: -0.5,
  },
  heroDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.whiteAlpha45,
  },
  heroScore: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.whiteAlpha60,
  },

  // ── Daily Grid
  dailyGridCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dailyGridTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.whiteAlpha45,
    marginBottom: spacing.md,
  },
  dailyGrid: {
    gap: 6,
  },
  dailyGridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dailyCell: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
  },
  dailyCellCorrect: {
    backgroundColor: colors.success,
  },
  dailyCellWrong: {
    backgroundColor: colors.whiteAlpha20,
  },

  // ── Stat Tiles
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
  },
  statTileValue: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.stat,
    lineHeight: 40,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  statTileUnit: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
  statTileLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  newBestBadge: {
    backgroundColor: colors.accentBg,
    borderRadius: borderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 10,
    marginTop: spacing.xs,
  },
  newBestText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.accent,
  },

  // ── Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  secondaryButton: {
    ...buttons.secondary,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...buttons.secondaryText,
    textAlign: 'center',
  },
  primaryButton: {
    ...buttons.primary,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...buttons.primaryText,
    textAlign: 'center',
  },

  // ── Badges
  badgesSection: {
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 6,
    gap: 12,
  },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContent: {
    flex: 1,
  },
  badgeName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.caption,
    color: colors.ink,
    marginBottom: 2,
  },
  badgeDesc: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  badgeTierPill: {
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeTierText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Progress
  progressSection: {
    marginBottom: spacing.md,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  progressTopRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: 14,
  },
  progressStat: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatValue: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.heading,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  progressStatLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  progressBarWrap: {
    height: 7,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  progressPctLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginTop: 6,
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 8,
  },
  viewStatsText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink,
    flex: 1,
  },

  // ── Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  sectionMeta: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },

  // ── Review
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderLeftWidth: 4,
    borderRadius: borderRadius.md,
    gap: 12,
  },
  reviewCorrect: {
    borderLeftColor: colors.success,
  },
  reviewWrong: {
    borderLeftColor: colors.error,
  },
  reviewIndex: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.caption,
    minWidth: 18,
    textAlign: 'center',
  },
  reviewIndexCorrect: {
    color: colors.success,
  },
  reviewIndexWrong: {
    color: colors.error,
  },
  reviewContent: {
    flex: 1,
  },
  reviewName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  reviewAnswer: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  reviewRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewTime: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
});
