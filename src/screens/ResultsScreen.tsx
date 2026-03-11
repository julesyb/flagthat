import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, buttons, borderRadius } from '../utils/theme';
import { calculateAccuracy, getStreakFromResults, getGrade, generateDailyShareGrid, generateShareGrid, getDailyNumber } from '../utils/gameEngine';
import { updateStats, updateFlagResults, saveDailyChallenge, incrementDailyChallenges, updateLastGameBadgeFlags, markShared, saveBaselineResult, getStats, getFlagStats, getDayStreak, getBadgeData, getMissedFlagIds, addGameHistoryEntry, getSupportData } from '../utils/storage';
import { BaselineRegionId } from '../types';
import { t } from '../utils/i18n';
import { hapticCorrect, hapticTap, playCelebrationSound } from '../utils/feedback';
import { FlagImageSmall } from '../components/FlagImage';
import { CheckIcon, CrossIcon, ChevronRightIcon, BarChartIcon, FlagIcon, GlobeIcon, PlayIcon, LightningIcon, CalendarIcon, ClockIcon, CrosshairIcon, LinkIcon, HeartIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import { UserStats, GameMode } from '../types';
import { RootStackParamList } from '../types/navigation';
import { evaluateBadges, BADGES, TIER_COLORS, BadgeIcon, EarnedBadge } from '../utils/badges';
import { getTotalFlagCount } from '../data';
import { useInterstitialAdUnit, shouldShowAd, recordAdImpression, incrementGameCount } from '../utils/ads';

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
  const isDaily = config.mode === 'daily';
  const isBaseline = config.mode === 'baseline';

  const skipAds = isDaily || isBaseline || reviewOnly;
  const interstitial = useInterstitialAdUnit();
  const [adEligible, setAdEligible] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);

  const fastestCorrect = results
    .filter((r) => r.correct)
    .reduce<{ name: string; time: number } | null>((best, r) => {
      if (!best || r.timeTaken < best.time) return { name: r.question.flag.name, time: r.timeTaken };
      return best;
    }, null);

  // ── Animation values ──
  // Phase 1: Count-up (0 → accuracy%)
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayAcc, setDisplayAcc] = useState(0);
  // Phase 2: Grade reveal (springs in after count-up)
  const gradeScale = useRef(new Animated.Value(0)).current;
  const gradeOpacity = useRef(new Animated.Value(0)).current;
  // Phase 3: Score line fade
  const scoreFade = useRef(new Animated.Value(0)).current;
  // Phase 4: Timeline dots (staggered springs)
  const dotAnims = useRef(results.map(() => new Animated.Value(0))).current;
  // Phase 5: Stats row
  const statsFade = useRef(new Animated.Value(0)).current;
  // Phase 6: Everything else
  const restFade = useRef(new Animated.Value(0)).current;
  // Perfect celebration + hero glow for great scores
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const heroGlow = useRef(new Animated.Value(0)).current;
  // Review items
  const reviewAnims = useRef(results.map(() => new Animated.Value(0))).current;
  // Progress bar
  const progressBarAnim = useRef(new Animated.Value(0)).current;

  // Progress data
  const [overallStats, setOverallStats] = useState<UserStats | null>(null);
  const [countriesSeen, setCountriesSeen] = useState(0);
  const [totalFlags, setTotalFlags] = useState(0);
  const [dayStreakCount, setDayStreakCount] = useState(0);
  const [newBadges, setNewBadges] = useState<EarnedBadge[]>([]);
  const [totalBadgesEarned, setTotalBadgesEarned] = useState(0);
  const [isNewBestStreak, setIsNewBestStreak] = useState(false);
  const [newCountriesCount, setNewCountriesCount] = useState(0);
  const [prevAccuracy, setPrevAccuracy] = useState<number | null>(null);
  const [weakFlagCount, setWeakFlagCount] = useState(0);

  // Load ad if frequency cap allows (skip for daily/baseline/review)
  useEffect(() => {
    if (skipAds) return;
    shouldShowAd().then((eligible) => {
      setAdEligible(eligible);
      if (eligible) {
        interstitial.load();
      }
    });
  }, [interstitial.load, skipAds]);

  // When ad closes, execute pending navigation
  useEffect(() => {
    if (interstitial.isClosed && pendingNavRef.current) {
      const nav = pendingNavRef.current;
      pendingNavRef.current = null;
      recordAdImpression().then(nav);
    }
  }, [interstitial.isClosed]);

  useEffect(() => {
    // Listen to count-up animation for display
    const listenerId = countAnim.addListener(({ value }) => {
      setDisplayAcc(Math.round(value));
    });
    return () => countAnim.removeListener(listenerId);
  }, [countAnim]);

  useEffect(() => {
    // ── Data processing ──
    async function processResults() {
      const [preStats, preFlagStats, preDayStreak, preBadgeData, preMissed, preSupport] = await Promise.all([
        getStats(), getFlagStats(), getDayStreak(), getBadgeData(), getMissedFlagIds(), getSupportData(),
      ]);
      const preBadgeIds = new Set(evaluateBadges({
        stats: preStats, flagStats: preFlagStats, dayStreak: preDayStreak,
        dailyChallengesCompleted: preBadgeData.dailyChallengesCompleted,
        hasShared: preBadgeData.hasShared,
        lastGamePerfect10: preBadgeData.lastGamePerfect10,
        lastGameSRank: preBadgeData.lastGameSRank,
        weakFlagCount: preMissed.length,
        adsWatched: preSupport.totalAdsWatched,
      }).map((b) => b.id));

      const wasNewBestStreak = streak > preStats.bestStreak;
      const prevAcc = preStats.totalAnswered > 0
        ? Math.round((preStats.totalCorrect / preStats.totalAnswered) * 100) : null;

      let newCountries = 0;
      for (const r of results) {
        if (r.correct) {
          const prev = preFlagStats[r.question.flag.id];
          if (!prev || prev.right === 0) newCountries++;
        }
      }

      if (!reviewOnly) {
        await updateStats(correct, results.length, streak, config.mode, config.category);
        await updateFlagResults(results);
        await updateLastGameBadgeFlags(correct, results.length);
        await addGameHistoryEntry(accuracy, config.mode);
        if (!skipAds) {
          incrementGameCount();
        }
        if (isDaily) {
          await saveDailyChallenge(results);
          await incrementDailyChallenges();
        }
      }
      if (isBaseline) {
        await saveBaselineResult(config.category as BaselineRegionId, results);
      }

      const [postStats, postFlagStats, postDayStreak, postBadgeData, postMissed, postSupport] = await Promise.all([
        getStats(), getFlagStats(), getDayStreak(), getBadgeData(), getMissedFlagIds(), getSupportData(),
      ]);
      const postBadges = evaluateBadges({
        stats: postStats, flagStats: postFlagStats, dayStreak: postDayStreak,
        dailyChallengesCompleted: postBadgeData.dailyChallengesCompleted,
        hasShared: postBadgeData.hasShared,
        lastGamePerfect10: postBadgeData.lastGamePerfect10,
        lastGameSRank: postBadgeData.lastGameSRank,
        weakFlagCount: postMissed.length,
        adsWatched: postSupport.totalAdsWatched,
      });

      setOverallStats(postStats);
      setDayStreakCount(postDayStreak);
      setTotalFlags(getTotalFlagCount());
      const seen = Object.values(postFlagStats).filter((fs) => fs.right > 0).length;
      setCountriesSeen(seen);
      setNewBadges(postBadges.filter((b) => !preBadgeIds.has(b.id)));
      setTotalBadgesEarned(postBadges.length);
      setIsNewBestStreak(wasNewBestStreak && !reviewOnly);
      setNewCountriesCount(reviewOnly ? 0 : newCountries);
      setPrevAccuracy(prevAcc);
      setWeakFlagCount(postMissed.length);

      // Animate progress bar after data loads
      const totalF = getTotalFlagCount();
      const pct = totalF > 0 ? seen / totalF : 0;
      Animated.timing(progressBarAnim, {
        toValue: pct,
        duration: 800,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    processResults();

    // ── Animation sequence ──
    // Phase 1: Count-up (0 → accuracy)
    Animated.timing(countAnim, {
      toValue: accuracy,
      duration: 1200,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Phase 2: Grade reveal (after count-up)
    const gradeDelay = 1500;
    Animated.parallel([
      Animated.spring(gradeScale, {
        toValue: 1, friction: 4, tension: 100, delay: gradeDelay, useNativeDriver: true,
      }),
      Animated.timing(gradeOpacity, {
        toValue: 1, duration: 200, delay: gradeDelay, useNativeDriver: true,
      }),
    ]).start();

    // Phase 3: Score text
    Animated.timing(scoreFade, {
      toValue: 1, duration: 300, delay: gradeDelay + 200, useNativeDriver: true,
    }).start();

    // Phase 4: Timeline dots (staggered)
    const dotsDelay = gradeDelay + 400;
    Animated.stagger(
      60,
      dotAnims.map((a) =>
        Animated.spring(a, { toValue: 1, friction: 6, tension: 120, delay: dotsDelay, useNativeDriver: true }),
      ),
    ).start();

    // Phase 5: Stats
    Animated.timing(statsFade, {
      toValue: 1, duration: 400, delay: dotsDelay + results.length * 60 + 100, useNativeDriver: true,
    }).start();

    // Phase 6: Rest
    const restDelay = dotsDelay + results.length * 60 + 400;
    Animated.timing(restFade, {
      toValue: 1, duration: 400, delay: restDelay, useNativeDriver: true,
    }).start();

    // Review items stagger
    Animated.stagger(
      40,
      reviewAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 200, delay: restDelay + 200, useNativeDriver: true }),
      ),
    ).start();

    // Celebration intensity scaling
    if (isPerfect) {
      // Full celebration: sound + haptic + pulsing banner + hero glow
      setTimeout(() => {
        hapticCorrect();
        playCelebrationSound();
      }, gradeDelay);
      const loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(confettiOpacity, { toValue: 1, duration: 500, delay: gradeDelay, useNativeDriver: true }),
          Animated.timing(confettiOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ]),
      );
      loopAnim.start();
      // Hero glow pulse
      Animated.sequence([
        Animated.timing(heroGlow, { toValue: 1, duration: 400, delay: gradeDelay, useNativeDriver: false }),
        Animated.timing(heroGlow, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
      return () => { loopAnim.stop(); };
    } else if (accuracy >= 90) {
      // Great score: haptic + hero glow flash (gold tint)
      setTimeout(() => {
        hapticCorrect();
      }, gradeDelay);
      Animated.sequence([
        Animated.timing(heroGlow, { toValue: 0.7, duration: 350, delay: gradeDelay, useNativeDriver: false }),
        Animated.timing(heroGlow, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]).start();
    } else if (accuracy >= 80) {
      // Good score: light haptic
      setTimeout(() => hapticTap(), gradeDelay);
    }
  }, []);

  const categoryLabel = config.category === 'all'
    ? t('categories.all') : t(`categories.${config.category}`);
  const modeLabel = t(`modes.${config.mode}`);
  const dailyNumber = isDaily ? getDailyNumber() : 0;

  const handleShare = async () => {
    const message = isDaily
      ? generateDailyShareGrid(results)
      : generateShareGrid(results, modeLabel, categoryLabel);
    try { await Share.share({ message }); markShared(); } catch { /* cancelled */ }
  };

  const goHome = () => navigation.popToTop();

  const navigatePlayAgain = useCallback(() => {
    if (isDaily || isBaseline) {
      navigation.popToTop();
      return;
    }
    const map: Partial<Record<GameMode, keyof RootStackParamList>> = {
      flagflash: 'FlagFlash', flagpuzzle: 'FlagPuzzle', neighbors: 'Neighbors',
      impostor: 'FlagImpostor', capitalconnection: 'CapitalConnection',
    };
    navigation.replace((map[config.mode] || 'Game') as 'Game', { config });
  }, [isDaily, isBaseline, config, navigation]);

  const playAgain = () => {
    if (adEligible && interstitial.isLoaded) {
      pendingNavRef.current = navigatePlayAgain;
      interstitial.show();
      // Safety: if ad never fires isClosed (SDK bug, network), unblock after 10s
      setTimeout(() => {
        if (pendingNavRef.current) {
          const nav = pendingNavRef.current;
          pendingNavRef.current = null;
          recordAdImpression().then(nav);
        }
      }, 10000);
    } else {
      navigatePlayAgain();
    }
  };

  // Contextual Play CTA text
  const playCtaText = isBaseline
    ? t('onboarding.next')
    : isDaily
    ? t('common.home')
    : overallStats && accuracy < (overallStats.totalAnswered > 0
        ? Math.round((overallStats.totalCorrect / overallStats.totalAnswered) * 100) : 100)
      ? t('results.beatYourScore')
      : dayStreakCount > 0
        ? t('results.keepTheStreak')
        : config.mode === 'easy' && accuracy >= 90
          ? t('results.tryHardMode')
          : t('results.playAgain');

  const progressPct = totalFlags > 0 ? Math.round((countriesSeen / totalFlags) * 100) : 0;
  const accDiff = prevAccuracy !== null ? accuracy - prevAccuracy : null;
  const accInsight = prevAccuracy === null
    ? t('results.firstGame')
    : accDiff !== null && accDiff > 0 ? t('results.aboveAverage', { pct: accDiff })
    : accDiff !== null && accDiff < 0 ? t('results.belowAverage', { pct: Math.abs(accDiff) })
    : null;

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
      case 'heart': return <HeartIcon size={size} color={tierColor} filled />;
      default: return <FlagIcon size={size} color={tierColor} />;
    }
  };

  // Interpolate progress bar width
  const progressBarWidth = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Hero glow: interpolate to a warm gold border overlay
  const heroGlowColor = heroGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(201, 150, 12, 0)', 'rgba(201, 150, 12, 0.35)'],
  });

  return (
    <SafeAreaView style={st.container}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* ── PERFECT BANNER ── */}
        {isPerfect && (
          <Animated.View style={[st.celebrationBanner, { opacity: confettiOpacity }]}>
            <Text style={st.celebrationText}>{t('results.perfectScore')}</Text>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════
            HERO: The score reveal. This IS the experience.
            Phase 1: accuracy counts up  0% → 87%
            Phase 2: grade letter springs in
            Phase 3: "8/10 correct" fades in
            ══════════════════════════════════════════════════════════ */}
        <Animated.View style={[st.heroCard, { borderColor: heroGlowColor, borderWidth: 2 }]}>
          <Text style={st.heroEyebrow}>
            {isDaily ? t('results.dailyTitle', { number: dailyNumber }) : `${modeLabel} / ${categoryLabel}`}
          </Text>

          {/* Count-up number */}
          <Text style={st.heroAccuracy}>{displayAcc}%</Text>

          {/* Grade letter (springs in after count-up) */}
          <Animated.View style={[
            st.heroGradeWrap,
            { opacity: gradeOpacity, transform: [{ scale: gradeScale }] },
          ]}>
            <Text style={[st.heroGrade, { color: grade.color }]}>{grade.label}</Text>
          </Animated.View>

          {/* Score line */}
          <Animated.Text style={[st.heroScoreText, { opacity: scoreFade }]}>
            {correct}/{results.length} {t('results.correct').toLowerCase()}
          </Animated.Text>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            STREAK TIMELINE: Dots appear one-by-one showing the flow
            ══════════════════════════════════════════════════════════ */}
        <View style={st.timelineCard}>
          <View style={st.timelineDots}>
            {results.map((r, i) => (
              <Animated.View
                key={i}
                style={[
                  st.timelineDot,
                  r.correct ? st.timelineDotCorrect : st.timelineDotWrong,
                  {
                    opacity: dotAnims[i],
                    transform: [{
                      scale: dotAnims[i].interpolate({
                        inputRange: [0, 1], outputRange: [0, 1],
                      }),
                    }],
                  },
                ]}
              />
            ))}
          </View>
          <Animated.View style={[st.timelineStats, { opacity: statsFade }]}>
            <View style={st.timelineStat}>
              <Text style={st.timelineStatValue}>{streak}</Text>
              <Text style={st.timelineStatLabel}>{t('results.bestStreak')}</Text>
              {isNewBestStreak && (
                <View style={st.newBestPill}>
                  <Text style={st.newBestPillText}>{t('results.newBest')}</Text>
                </View>
              )}
            </View>
            <View style={st.timelineDivider} />
            <View style={st.timelineStat}>
              <Text style={st.timelineStatValue}>{avgTime}<Text style={st.timelineStatUnit}>s</Text></Text>
              <Text style={st.timelineStatLabel}>{t('results.avgTime')}</Text>
            </View>
            {fastestCorrect && (
              <>
                <View style={st.timelineDivider} />
                <View style={st.timelineStat}>
                  <Text style={st.timelineStatValue}>
                    {Math.round(fastestCorrect.time / 100) / 10}<Text style={st.timelineStatUnit}>s</Text>
                  </Text>
                  <Text style={st.timelineStatLabel}>{t('results.fastest')}</Text>
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {/* ── DAILY GRID ── */}
        {isDaily && (
          <Animated.View style={[st.dailyGridCard, { opacity: statsFade }]}>
            <Text style={st.dailyGridTitle}>{t('results.shareTitle', { number: dailyNumber })}</Text>
            <View style={st.dailyGrid}>
              <View style={st.dailyGridRow}>
                {results.slice(0, 5).map((r, i) => (
                  <View key={i} style={[st.dailyCell, r.correct ? st.dailyCellCorrect : st.dailyCellWrong]} />
                ))}
              </View>
              <View style={st.dailyGridRow}>
                {results.slice(5, 10).map((r, i) => (
                  <View key={i} style={[st.dailyCell, r.correct ? st.dailyCellCorrect : st.dailyCellWrong]} />
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── INSIGHT CHIPS ── */}
        {!reviewOnly && (
          <Animated.View style={[st.insightRow, { opacity: restFade }]}>
            {newCountriesCount > 0 && (
              <View style={st.insightChip}>
                <GlobeIcon size={13} color={colors.success} />
                <Text style={[st.insightText, { color: colors.success }]}>
                  {t('results.newCountries', { count: newCountriesCount })}
                </Text>
              </View>
            )}
            {accInsight && (
              <View style={st.insightChip}>
                <BarChartIcon size={13} color={accDiff !== null && accDiff >= 0 ? colors.success : colors.textTertiary} />
                <Text style={[st.insightText, accDiff !== null && accDiff > 0 && { color: colors.success }]}>
                  {accInsight}
                </Text>
              </View>
            )}
            {dayStreakCount > 0 && (
              <View style={st.insightChip}>
                <CalendarIcon size={13} color={colors.accent} />
                <Text style={[st.insightText, { color: colors.accent }]}>
                  {dayStreakCount} {t('stats.dayStreak').toLowerCase()}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── ACTION BUTTONS ── */}
        <Animated.View style={[st.buttonRow, { opacity: restFade }]}>
          {!isBaseline && (
            <TouchableOpacity style={st.secondaryButton} onPress={handleShare} activeOpacity={0.7}>
              <Text style={st.secondaryButtonText}>{t('common.share')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={st.primaryButton} onPress={playAgain} activeOpacity={0.7}>
            <Text style={st.primaryButtonText}>{playCtaText}</Text>
          </TouchableOpacity>
          {!isDaily && !isBaseline && (
            <TouchableOpacity style={st.secondaryButton} onPress={goHome} activeOpacity={0.7}>
              <Text style={st.secondaryButtonText}>{t('common.home')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── NEWLY EARNED BADGES ── */}
        {newBadges.length > 0 && (
          <Animated.View style={[st.badgesSection, { opacity: restFade }]}>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>{t('results.badgesUnlocked')}</Text>
              <Text style={st.sectionMeta}>
                {t('stats.badgesEarned', { earned: totalBadgesEarned, total: BADGES.length })}
              </Text>
            </View>
            {newBadges.map((badge) => {
              const tierColor = TIER_COLORS[badge.tier];
              return (
                <View key={badge.id} style={st.badgeRow}>
                  <View style={[st.badgeIconWrap, { backgroundColor: tierColor + '18' }]}>
                    {renderBadgeIcon(badge.icon, tierColor)}
                  </View>
                  <View style={st.badgeContent}>
                    <Text style={st.badgeName}>{badge.name}</Text>
                    <Text style={st.badgeDesc}>{badge.description}</Text>
                  </View>
                  <View style={[st.badgeTierPill, { backgroundColor: tierColor + '18' }]}>
                    <Text style={[st.badgeTierText, { color: tierColor }]}>{badge.tier}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* ── YOUR PROGRESS (animated bar) ── */}
        {overallStats && !reviewOnly && (
          <Animated.View style={[st.progressSection, { opacity: restFade }]}>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>{t('results.yourProgress')}</Text>
            </View>
            <View style={st.progressCard}>
              <View style={st.progressTopRow}>
                <View style={st.progressStat}>
                  <Text style={st.progressStatValue}>{countriesSeen}</Text>
                  <Text style={st.progressStatLabel}>
                    {t('stats.countriesOf', { seen: countriesSeen, total: totalFlags })}
                  </Text>
                </View>
                <View style={st.progressStat}>
                  <Text style={st.progressStatValue}>{overallStats.totalGamesPlayed}</Text>
                  <Text style={st.progressStatLabel}>{t('stats.gamesPlayed')}</Text>
                </View>
              </View>
              <View style={st.progressBarWrap}>
                <Animated.View style={[st.progressBarFill, { width: progressBarWidth }]} />
              </View>
              <Text style={st.progressPctLabel}>{t('stats.percentComplete', { pct: progressPct })}</Text>
            </View>

            {weakFlagCount > 0 && (
              <TouchableOpacity
                style={st.practiceButton}
                onPress={() => navigation.replace('Game', {
                  config: { mode: 'practice', category: 'all', questionCount: weakFlagCount, displayMode: 'flag' },
                })}
                activeOpacity={0.7}
              >
                <CrosshairIcon size={16} color={colors.accent} />
                <Text style={st.practiceButtonText}>{t('results.practiceWeak')}</Text>
                <Text style={st.practiceButtonMeta}>{t('results.flagsToReview', { count: weakFlagCount })}</Text>
                <ChevronRightIcon size={14} color={colors.accent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={st.viewStatsButton} onPress={() => navigation.navigate('Stats')} activeOpacity={0.7}>
              <BarChartIcon size={16} color={colors.ink} />
              <Text style={st.viewStatsText}>{t('results.viewAllStats')}</Text>
              <ChevronRightIcon size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── REVIEW ── */}
        <Animated.View style={{ opacity: restFade }}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionTitle}>{t('common.review')}</Text>
            <Text style={st.sectionMeta}>{correct}/{results.length} {t('results.correct').toLowerCase()}</Text>
          </View>
        </Animated.View>
        {results.map((result, index) => {
          const itemTime = Math.round(result.timeTaken / 100) / 10;
          const isFastest = fastestCorrect && result.correct && result.timeTaken === fastestCorrect.time;
          return (
            <Animated.View
              key={index}
              style={[
                st.reviewItem,
                result.correct ? st.reviewCorrect : st.reviewWrong,
                {
                  opacity: reviewAnims[index],
                  transform: [{ translateY: reviewAnims[index].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                },
              ]}
            >
              <Text style={[st.reviewIndex, result.correct ? st.reviewIndexCorrect : st.reviewIndexWrong]}>
                {index + 1}
              </Text>
              <FlagImageSmall countryCode={result.question.flag.id} emoji={result.question.flag.emoji} />
              <View style={st.reviewContent}>
                <Text style={st.reviewName}>{result.question.flag.name}</Text>
                {!result.correct && result.userAnswer !== 'SKIPPED' && (
                  <Text style={st.reviewAnswer}>{t('results.youSaid', { answer: result.userAnswer })}</Text>
                )}
                {result.userAnswer === 'SKIPPED' && (
                  <Text style={st.reviewAnswer}>{t('results.skipped')}</Text>
                )}
              </View>
              <View style={st.reviewRight}>
                <Text style={[st.reviewTime, isFastest && st.reviewTimeFastest]}>{itemTime}s</Text>
                {result.correct ? <CheckIcon size={18} color={colors.success} /> : <CrossIcon size={18} color={colors.error} />}
              </View>
            </Animated.View>
          );
        })}

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

// ─── Styles ────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // ── Celebration
  celebrationBanner: {
    backgroundColor: colors.warning, padding: spacing.md,
    alignItems: 'center', marginBottom: spacing.sm, borderRadius: borderRadius.md,
  },
  celebrationText: { ...typography.headingUpper, color: colors.primary },

  // ── Hero (THE centerpiece)
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
    fontSize: fontSize.countdown, // 120px - THE number
    color: colors.white,
    letterSpacing: -3,
    lineHeight: 120,
  },
  heroGradeWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroGrade: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.gameTitle, // 42px
    letterSpacing: -1,
  },
  heroScoreText: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.lg,
    color: colors.whiteAlpha60,
  },

  // ── Timeline
  timelineCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    marginBottom: spacing.sm,
  },
  timelineDots: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginBottom: spacing.md,
  },
  timelineDot: {
    width: 16, height: 16, borderRadius: 4,
  },
  timelineDotCorrect: { backgroundColor: colors.success },
  timelineDotWrong: { backgroundColor: colors.error },
  timelineStats: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStat: { flex: 1, alignItems: 'center' },
  timelineDivider: { width: 1, height: 36, backgroundColor: colors.border },
  timelineStatValue: {
    fontFamily: fontFamily.display, fontSize: fontSize.heading,
    color: colors.ink, letterSpacing: -0.5,
  },
  timelineStatUnit: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.caption, color: colors.textTertiary,
  },
  timelineStatLabel: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.xxs, letterSpacing: 0.8,
    textTransform: 'uppercase', color: colors.textTertiary, marginTop: spacing.xxs,
  },
  newBestPill: {
    backgroundColor: colors.accentBg, borderRadius: borderRadius.full,
    paddingVertical: 2, paddingHorizontal: 8, marginTop: spacing.xxs,
  },
  newBestPillText: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.xxs,
    letterSpacing: 0.6, textTransform: 'uppercase', color: colors.accent,
  },

  // ── Daily Grid
  dailyGridCard: {
    backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm,
  },
  dailyGridTitle: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.sm,
    letterSpacing: 1.5, textTransform: 'uppercase',
    color: colors.whiteAlpha45, marginBottom: spacing.md,
  },
  dailyGrid: { gap: 6 },
  dailyGridRow: { flexDirection: 'row', gap: 6 },
  dailyCell: { width: 44, height: 44, borderRadius: borderRadius.sm },
  dailyCellCorrect: { backgroundColor: colors.success },
  dailyCellWrong: { backgroundColor: colors.whiteAlpha20 },

  // ── Insights
  insightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  insightChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.full, paddingVertical: 6, paddingHorizontal: 12,
  },
  insightText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },

  // ── Buttons
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  secondaryButton: { ...buttons.secondary, flex: 1, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { ...buttons.secondaryText, textAlign: 'center' },
  primaryButton: { ...buttons.primary, flex: 1, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { ...buttons.primaryText, textAlign: 'center' },

  // ── Badges
  badgesSection: { marginBottom: spacing.md },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 6, gap: 12,
  },
  badgeIconWrap: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  badgeContent: { flex: 1 },
  badgeName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.caption, color: colors.ink, marginBottom: 2 },
  badgeDesc: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  badgeTierPill: { borderRadius: borderRadius.full, paddingVertical: 3, paddingHorizontal: 10 },
  badgeTierText: { fontFamily: fontFamily.uiLabel, fontSize: fontSize.xxs, letterSpacing: 0.8, textTransform: 'uppercase' },

  // ── Progress
  progressSection: { marginBottom: spacing.md },
  progressCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 18,
  },
  progressTopRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: 14 },
  progressStat: { alignItems: 'center', flex: 1 },
  progressStatValue: { fontFamily: fontFamily.display, fontSize: fontSize.heading, color: colors.ink, letterSpacing: -0.5 },
  progressStatLabel: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.xxs, letterSpacing: 0.8,
    textTransform: 'uppercase', color: colors.textTertiary, marginTop: spacing.xxs, textAlign: 'center',
  },
  progressBarWrap: {
    height: 7, backgroundColor: colors.border, borderRadius: borderRadius.full, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: borderRadius.full },
  progressPctLabel: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm, color: colors.ink, marginTop: 6 },
  practiceButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accentBg, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.accent, padding: 14, marginTop: 8,
  },
  practiceButtonText: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.caption,
    letterSpacing: 0.8, textTransform: 'uppercase', color: colors.accent,
  },
  practiceButtonMeta: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.textTertiary, flex: 1, textAlign: 'right',
  },
  viewStatsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginTop: 8,
  },
  viewStatsText: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.caption,
    letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink, flex: 1,
  },

  // ── Sections
  sectionHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.xxs,
    letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textTertiary,
  },
  sectionMeta: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textTertiary },

  // ── Review
  reviewItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: 12, paddingHorizontal: 14, marginBottom: 6,
    borderLeftWidth: 4, borderRadius: borderRadius.md, gap: 12,
  },
  reviewCorrect: { borderLeftColor: colors.success },
  reviewWrong: { borderLeftColor: colors.error },
  reviewIndex: { fontFamily: fontFamily.display, fontSize: fontSize.caption, minWidth: 18, textAlign: 'center' },
  reviewIndexCorrect: { color: colors.success },
  reviewIndexWrong: { color: colors.error },
  reviewContent: { flex: 1 },
  reviewName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.body, color: colors.text },
  reviewAnswer: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error, marginTop: spacing.xxs },
  reviewRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewTime: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textTertiary },
  reviewTimeFastest: { color: colors.success },
});
