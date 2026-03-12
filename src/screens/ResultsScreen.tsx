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
  TextInput,
  Modal,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, buttons, borderRadius, screenContainer, APP_URL } from '../utils/theme';
import { getStreakFromResults, getGrade, generateDailyShareGrid, generateShareGrid, getDailyNumber } from '../utils/gameEngine';
import { updateStats, updateFlagResults, saveDailyChallenge, incrementDailyChallenges, markShared, saveBaselineResult, getStats, getFlagStats, getDayStreakInfo, getBadgeData, persistEarnedBadges, getMissedFlagIds, addGameHistoryEntry, getSupportData, getChallengeName, saveChallengeName, addChallengeToHistory } from '../utils/storage';
import { BaselineRegionId, UserStats, GameMode, CategoryId } from '../types';
import { t } from '../utils/i18n';
import { hapticCorrect, hapticTap, playCelebrationSound } from '../utils/feedback';
import { FlagImageSmall } from '../components/FlagImage';
import { CheckIcon, CrossIcon, ChevronRightIcon, BarChartIcon, GlobeIcon, CalendarIcon, UsersIcon, CrosshairIcon, BadgeIconView } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import { countCorrect } from '../utils/gameHelpers';
import { RootStackParamList } from '../types/navigation';
import { getAllEarnedBadges, detectPerGameBadges, buildBadgeContext, BADGES, TIER_COLORS, EarnedBadge } from '../utils/badges';
import { getTotalFlagCount, getCategoryCount } from '../data';
import { useInterstitialAdUnit, shouldShowAd, recordAdImpression, incrementGameCount } from '../utils/ads';
import { encodeChallenge, ChallengeData, CHALLENGE_MODES, generateShortCode } from '../utils/challengeCode';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export default function ResultsScreen({ route, navigation }: Props) {
  const onNavigate = useNavTabs();
  const { results, config, reviewOnly, challenge, playerName } = route.params;
  const isChallenge = !!challenge;
  const canChallenge = CHALLENGE_MODES.includes(config.mode);
  const correct = countCorrect(results);
  const isDaily = config.mode === 'daily';
  const isBaseline = config.mode === 'baseline';
  const questionTotal = isBaseline ? getCategoryCount(config.category as CategoryId) : results.length;
  const accuracy = questionTotal > 0 ? Math.round((correct / questionTotal) * 100) : 0;
  const streak = getStreakFromResults(results);
  const grade = getGrade(accuracy);
  const avgTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.timeTaken, 0) / results.length / 1000 * 10) / 10
    : 0;
  const isPerfect = accuracy === 100 && results.length > 0;

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

  // Challenge modal state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeName, setChallengeName] = useState('');

  // Load saved challenge name
  useEffect(() => {
    getChallengeName().then((saved) => {
      if (saved) setChallengeName(saved);
    });
  }, []);

  const doShareChallenge = async (name: string) => {
    const flagIds = results.map((r) => r.question.flag.id);
    const hostResults = results.map((r) => ({ correct: r.correct, timeMs: r.timeTaken }));
    const challengeData: ChallengeData = {
      hostName: name,
      mode: config.mode,
      timeLimit: config.timeLimit || 15,
      flagIds,
      hostResults,
    };
    const code = encodeChallenge(challengeData);
    if (!code) {
      const msg = t('challenge.invalidCode');
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(t('challenge.invalidCodeTitle'), msg);
      }
      return;
    }
    const shortCode = generateShortCode(challengeData);
    const link = `${APP_URL}/c/${code}`;
    const headline = t('challenge.shareMessage', { correct, total: results.length });
    const message = `${headline}\n\n${link}`;
    // Save to challenge history
    addChallengeToHistory({
      shortCode,
      mode: config.mode,
      date: new Date().toISOString(),
      myName: name,
      myScore: correct,
      totalFlags: results.length,
      opponentName: null,
      opponentScore: null,
      direction: 'sent',
      fullCode: code,
    });
    try {
      await Share.share({ message });
    } catch { /* share cancelled */ }
  };

  const handleChallengeShare = async () => {
    if (challengeName.trim().length === 0) return;
    Keyboard.dismiss();
    setShowChallengeModal(false);
    hapticTap();
    saveChallengeName(challengeName.trim());
    await doShareChallenge(challengeName.trim());
  };

  const handleChallengeTap = () => {
    hapticTap();
    if (challengeName.trim().length > 0) {
      // Name already saved, share directly
      doShareChallenge(challengeName.trim());
    } else {
      // Need name first
      setShowChallengeModal(true);
    }
  };

  // Head-to-head comparison data
  const h2h = isChallenge && challenge ? (() => {
    const hostCorrect = countCorrect(challenge.hostResults);
    const playerCorrect = countCorrect(results);
    const h2hTotal = challenge.flagIds.length;
    // Compute raw averages in ms for fair comparison (host times have 100ms granularity from encoding)
    const hostAvgMs = challenge.hostResults.length > 0
      ? challenge.hostResults.reduce((s, r) => s + r.timeMs, 0) / challenge.hostResults.length
      : 0;
    const playerAvgMs = results.length > 0
      ? results.reduce((s, r) => s + r.timeTaken, 0) / results.length
      : 0;
    // Display values rounded to 1 decimal
    const hostAvg = Math.round(hostAvgMs / 100) / 10;
    const playerAvg = Math.round(playerAvgMs / 100) / 10;
    // Winner: more correct wins. Tie-break: faster avg time (compare raw ms for precision).
    let winner: 'host' | 'player' | 'tie' = 'tie';
    if (playerCorrect > hostCorrect) winner = 'player';
    else if (hostCorrect > playerCorrect) winner = 'host';
    else if (playerAvgMs < hostAvgMs) winner = 'player';
    else if (hostAvgMs < playerAvgMs) winner = 'host';
    return { hostCorrect, playerCorrect, hostAvg, playerAvg, h2hTotal, winner };
  })() : null;

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
      // ── Snapshot pre-game state ──
      const [preStats, preFlagStats, preDayStreakInfo, preBadgeData, preMissed, preSupport] = await Promise.all([
        getStats(), getFlagStats(), getDayStreakInfo(), getBadgeData(), getMissedFlagIds(), getSupportData(),
      ]);
      const preCtx = buildBadgeContext(preStats, preFlagStats, preDayStreakInfo, preBadgeData, preMissed.length, preSupport.totalAdsWatched);
      const preBadgeIds = new Set(getAllEarnedBadges(preCtx, preBadgeData.earnedBadgeIds).map((b) => b.id));

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

      // ── Persist game data ──
      if (!reviewOnly) {
        await updateStats(correct, results.length, streak, config.mode, config.category);
        await updateFlagResults(results);
        await addGameHistoryEntry(accuracy, config.mode);
        if (!skipAds) {
          incrementGameCount();
        }
        if (isDaily) {
          await saveDailyChallenge(results);
          await incrementDailyChallenges();
        }
        // Save received challenge to history
        if (isChallenge && challenge && playerName) {
          const shortCode = generateShortCode(challenge);
          const hostScore = challenge.hostResults.filter((r) => r.correct).length;
          addChallengeToHistory({
            shortCode,
            mode: config.mode,
            date: new Date().toISOString(),
            myName: playerName,
            myScore: correct,
            totalFlags: results.length,
            opponentName: challenge.hostName,
            opponentScore: hostScore,
            direction: 'received',
            fullCode: encodeChallenge(challenge) || '',
          });
        }
      }
      if (isBaseline) {
        const regionTotal = getCategoryCount(config.category as CategoryId);
        await saveBaselineResult(config.category as BaselineRegionId, results, regionTotal);
      }

      // ── Snapshot post-game state and evaluate badges ──
      const [postStats, postFlagStats, postDayStreakInfo, postBadgeData, postMissed, postSupport] = await Promise.all([
        getStats(), getFlagStats(), getDayStreakInfo(), getBadgeData(), getMissedFlagIds(), getSupportData(),
      ]);
      const postCtx = buildBadgeContext(postStats, postFlagStats, postDayStreakInfo, postBadgeData, postMissed.length, postSupport.totalAdsWatched);
      // Merge persisted IDs + per-game badges detected from results, then evaluate
      const perGameIds = !reviewOnly ? detectPerGameBadges(results, correct, results.length) : [];
      const allPersistedIds = [...postBadgeData.earnedBadgeIds, ...perGameIds];
      const postBadges = getAllEarnedBadges(postCtx, allPersistedIds);
      // Single persist call for all earned badges
      await persistEarnedBadges(postBadges.map((b) => b.id));

      setOverallStats(postStats);
      setDayStreakCount(postDayStreakInfo.current);
      const totalF = getTotalFlagCount();
      setTotalFlags(totalF);
      const seen = Object.values(postFlagStats).filter((fs) => fs.right > 0).length;
      setCountriesSeen(seen);
      setNewBadges(postBadges.filter((b) => !preBadgeIds.has(b.id)));
      setTotalBadgesEarned(postBadges.length);
      setIsNewBestStreak(wasNewBestStreak && !reviewOnly);
      setNewCountriesCount(reviewOnly ? 0 : newCountries);
      setPrevAccuracy(prevAcc);
      setWeakFlagCount(postMissed.length);

      // Animate progress bar after data loads
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
  const dataLoaded = overallStats !== null;
  const accDiff = prevAccuracy !== null ? accuracy - prevAccuracy : null;
  const accInsight = !dataLoaded
    ? null
    : prevAccuracy === null
    ? t('results.firstGame')
    : accDiff !== null && accDiff > 0 ? t('results.aboveAverage', { pct: accDiff })
    : accDiff !== null && accDiff < 0 ? t('results.belowAverage', { pct: Math.abs(accDiff) })
    : null;

  // Interpolate progress bar width
  const progressBarWidth = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Hero glow: interpolate to a warm gold border overlay
  const heroGlowColor = heroGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.goldGlow0, colors.goldGlow35],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenContainer>

        {/* ── PERFECT BANNER ── */}
        {isPerfect && (
          <Animated.View style={[styles.celebrationBanner, { opacity: confettiOpacity }]}>
            <Text style={styles.celebrationText}>{t('results.perfectScore')}</Text>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════
            HERO: The score reveal. This IS the experience.
            Phase 1: accuracy counts up  0% → 87%
            Phase 2: grade letter springs in
            Phase 3: "8/10 correct" fades in
            ══════════════════════════════════════════════════════════ */}
        <Animated.View style={[styles.heroCard, { borderColor: heroGlowColor, borderWidth: 2 }]}>
          <Text style={styles.heroEyebrow}>
            {isDaily ? t('results.dailyTitle', { number: dailyNumber }) : `${modeLabel} / ${categoryLabel}`}
          </Text>

          {/* Count-up number */}
          <Text style={styles.heroAccuracy}>{displayAcc}%</Text>

          {/* Grade letter (springs in after count-up) */}
          <Animated.View style={[
            styles.heroGradeWrap,
            { opacity: gradeOpacity, transform: [{ scale: gradeScale }] },
          ]}>
            <Text style={[styles.heroGrade, { color: grade.color }]}>{grade.label}</Text>
          </Animated.View>

          {/* Score line */}
          <Animated.Text style={[styles.heroScoreText, { opacity: scoreFade }]}>
            {correct}/{questionTotal} {t('results.correct').toLowerCase()}
          </Animated.Text>
        </Animated.View>

        {/* ── HEAD-TO-HEAD (challenge mode) ── */}
        {h2h && challenge && (
          <Animated.View style={[styles.h2hCard, { opacity: scoreFade }]}>
            <Text style={styles.h2hTitle}>{t('challenge.headToHead')}</Text>
            <View style={styles.h2hRow}>
              <View style={styles.h2hPlayer}>
                <Text style={[
                  styles.h2hName,
                  h2h.winner === 'player' && styles.h2hNameWinner,
                ]}>{playerName || t('challenge.you')}</Text>
                <Text style={styles.h2hScore}>{h2h.playerCorrect}/{h2h.h2hTotal}</Text>
                <Text style={styles.h2hTime}>{h2h.playerAvg}s {t('results.avgTime').toLowerCase()}</Text>
              </View>
              <View style={styles.h2hVs}>
                <Text style={styles.h2hVsText}>{t('common.vs')}</Text>
              </View>
              <View style={styles.h2hPlayer}>
                <Text style={[
                  styles.h2hName,
                  h2h.winner === 'host' && styles.h2hNameWinner,
                ]}>{challenge.hostName}</Text>
                <Text style={styles.h2hScore}>{h2h.hostCorrect}/{h2h.h2hTotal}</Text>
                <Text style={styles.h2hTime}>{h2h.hostAvg}s {t('results.avgTime').toLowerCase()}</Text>
              </View>
            </View>
            <Text style={[styles.h2hResult, {
              color: h2h.winner === 'player' ? colors.success
                : h2h.winner === 'host' ? colors.error
                : colors.textSecondary,
            }]}>
              {h2h.winner === 'player' ? t('challenge.youWin')
                : h2h.winner === 'host' ? t('challenge.theyWin', { name: challenge.hostName })
                : t('challenge.tie')}
            </Text>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════
            STREAK TIMELINE: Dots appear one-by-one showing the flow
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineDots}>
            {results.map((r, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.timelineDot,
                  r.correct ? styles.timelineDotCorrect : styles.timelineDotWrong,
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
          <Animated.View style={[styles.timelineStats, { opacity: statsFade }]}>
            <View style={styles.timelineStat}>
              <Text style={styles.timelineStatValue}>{streak}</Text>
              <Text style={styles.timelineStatLabel}>{t('results.bestStreak')}</Text>
              {isNewBestStreak && (
                <View style={styles.newBestPill}>
                  <Text style={styles.newBestPillText}>{t('results.newBest')}</Text>
                </View>
              )}
            </View>
            <View style={styles.timelineDivider} />
            <View style={styles.timelineStat}>
              <Text style={styles.timelineStatValue}>{avgTime}<Text style={styles.timelineStatUnit}>s</Text></Text>
              <Text style={styles.timelineStatLabel}>{t('results.avgTime')}</Text>
            </View>
            {fastestCorrect && (
              <>
                <View style={styles.timelineDivider} />
                <View style={styles.timelineStat}>
                  <Text style={styles.timelineStatValue}>
                    {Math.round(fastestCorrect.time / 100) / 10}<Text style={styles.timelineStatUnit}>s</Text>
                  </Text>
                  <Text style={styles.timelineStatLabel}>{t('results.fastest')}</Text>
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {/* ── DAILY GRID ── */}
        {isDaily && (
          <Animated.View style={[styles.dailyGridCard, { opacity: statsFade }]}>
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
          </Animated.View>
        )}

        {/* ── INSIGHT CHIPS ── */}
        {!reviewOnly && (
          <Animated.View style={[styles.insightRow, { opacity: restFade }]}>
            {newCountriesCount > 0 && (
              <View style={styles.insightChip}>
                <GlobeIcon size={13} color={colors.success} />
                <Text style={[styles.insightText, { color: colors.success }]}>
                  {t('results.newCountries', { count: newCountriesCount })}
                </Text>
              </View>
            )}
            {accInsight && (
              <View style={styles.insightChip}>
                <BarChartIcon size={13} color={accDiff !== null && accDiff >= 0 ? colors.success : colors.textTertiary} />
                <Text style={[styles.insightText, accDiff !== null && accDiff > 0 && { color: colors.success }]}>
                  {accInsight}
                </Text>
              </View>
            )}
            {dayStreakCount > 0 && (
              <View style={styles.insightChip}>
                <CalendarIcon size={13} color={colors.accent} />
                <Text style={[styles.insightText, { color: colors.accent }]}>
                  {dayStreakCount} {t('stats.dayStreak').toLowerCase()}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── ACTION BUTTONS ── */}
        <Animated.View style={[styles.buttonRow, { opacity: restFade }]}>
          {!isBaseline && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.secondaryButtonText}>{t('common.share')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={playAgain} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{playCtaText}</Text>
          </TouchableOpacity>
          {!isDaily && !isBaseline && (
            <TouchableOpacity style={styles.secondaryButton} onPress={goHome} activeOpacity={0.7}>
              <Text style={styles.secondaryButtonText}>{t('common.home')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── CHALLENGE A FRIEND ── */}
        {canChallenge && !isChallenge && !reviewOnly && (
          <Animated.View style={{ opacity: restFade }}>
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={handleChallengeTap}
              activeOpacity={0.7}
            >
              <UsersIcon size={18} color={colors.ink} />
              <Text style={styles.challengeButtonTitle}>{t('challenge.challengeFriend')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── CHALLENGE BACK ── */}
        {isChallenge && canChallenge && !reviewOnly && (
          <Animated.View style={{ opacity: restFade }}>
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={() => { hapticTap(); navigation.replace('GameSetup', { initialMode: config.mode }); }}
              activeOpacity={0.7}
            >
              <UsersIcon size={18} color={colors.ink} />
              <Text style={styles.challengeButtonTitle}>{t('challenge.challengeBack')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── NEWLY EARNED BADGES ── */}
        {newBadges.length > 0 && (
          <Animated.View style={[styles.badgesSection, { opacity: restFade }]}>
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
                    <BadgeIconView icon={badge.icon} color={tierColor} />
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
          </Animated.View>
        )}

        {/* ── YOUR PROGRESS (animated bar) ── */}
        {overallStats && !reviewOnly && (
          <Animated.View style={[styles.progressSection, { opacity: restFade }]}>
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
              </View>
              <View style={styles.progressBarWrap}>
                <Animated.View style={[styles.progressBarFill, { width: progressBarWidth }]} />
              </View>
              <Text style={styles.progressPctLabel}>{t('stats.percentComplete', { pct: progressPct })}</Text>
            </View>

            {weakFlagCount > 0 && (
              <TouchableOpacity
                style={styles.practiceButton}
                onPress={() => navigation.replace('Game', {
                  config: { mode: 'practice', category: 'all', questionCount: weakFlagCount, displayMode: 'flag' },
                })}
                activeOpacity={0.7}
              >
                <CrosshairIcon size={16} color={colors.accent} />
                <Text style={styles.practiceButtonText}>{t('results.practiceWeak')}</Text>
                <Text style={styles.practiceButtonMeta}>{t('results.flagsToReview', { count: weakFlagCount })}</Text>
                <ChevronRightIcon size={14} color={colors.accent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.viewStatsButton} onPress={() => navigation.navigate('Stats')} activeOpacity={0.7}>
              <BarChartIcon size={16} color={colors.ink} />
              <Text style={styles.viewStatsText}>{t('results.viewAllStats')}</Text>
              <ChevronRightIcon size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── REVIEW ── */}
        <Animated.View style={{ opacity: restFade }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('common.review')}</Text>
            <Text style={styles.sectionMeta}>{correct}/{questionTotal} {t('results.correct').toLowerCase()}</Text>
          </View>
        </Animated.View>
        {results.map((result, index) => {
          const itemTime = Math.round(result.timeTaken / 100) / 10;
          const isFastest = fastestCorrect && result.correct && result.timeTaken === fastestCorrect.time;
          const opponentResult = challenge?.hostResults[index];
          return (
            <Animated.View
              key={index}
              style={[
                styles.reviewItem,
                result.correct ? styles.reviewCorrect : styles.reviewWrong,
                {
                  opacity: reviewAnims[index],
                  transform: [{ translateY: reviewAnims[index].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                },
              ]}
            >
              <Text style={[styles.reviewIndex, result.correct ? styles.reviewIndexCorrect : styles.reviewIndexWrong]}>
                {index + 1}
              </Text>
              <FlagImageSmall countryCode={result.question.flag.id} />
              <View style={styles.reviewContent}>
                <Text style={styles.reviewName}>{result.question.flag.name}</Text>
                {!result.correct && result.userAnswer !== 'SKIPPED' && (
                  <Text style={styles.reviewAnswer}>{t('results.youSaid', { answer: result.userAnswer })}</Text>
                )}
                {result.userAnswer === 'SKIPPED' && (
                  <Text style={styles.reviewAnswer}>{t('results.skipped')}</Text>
                )}
                {isChallenge && opponentResult && (
                  <Text style={styles.reviewOpponent}>
                    {challenge.hostName}: {opponentResult.correct ? <CheckIcon size={12} color={colors.success} /> : <CrossIcon size={12} color={colors.error} />}
                  </Text>
                )}
              </View>
              <View style={styles.reviewRight}>
                <Text style={[styles.reviewTime, isFastest && styles.reviewTimeFastest]}>{itemTime}s</Text>
                {result.correct ? <CheckIcon size={18} color={colors.success} /> : <CrossIcon size={18} color={colors.error} />}
              </View>
            </Animated.View>
          );
        })}

        <View style={{ height: spacing.lg }} />
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Home" onNavigate={onNavigate} />

      {/* ── Challenge name modal (only shown if no saved name) ── */}
      <Modal
        visible={showChallengeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChallengeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChallengeModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('challenge.enterName')}</Text>
            <TextInput
              style={styles.modalInput}
              value={challengeName}
              onChangeText={setChallengeName}
              placeholder={t('challenge.namePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={20}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={challengeName.trim().length > 0 ? handleChallengeShare : undefined}
            />
            <TouchableOpacity
              style={[styles.modalShare, challengeName.trim().length === 0 && styles.modalShareDisabled]}
              onPress={handleChallengeShare}
              disabled={challengeName.trim().length === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.modalShareText}>{t('common.share')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: screenContainer,
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // ── Celebration
  celebrationBanner: {
    backgroundColor: colors.warning, padding: spacing.md,
    alignItems: 'center', marginBottom: spacing.sm, borderRadius: borderRadius.md,
  },
  celebrationText: { ...typography.headingUpper, color: colors.primary },

  // ── Hero (THE centerpiece)
  heroCard: {
    backgroundColor: colors.surface,
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
  buttonRow: { gap: spacing.sm, marginBottom: spacing.md },
  secondaryButton: { ...buttons.secondary, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { ...buttons.secondaryText, textAlign: 'center' },
  primaryButton: { ...buttons.primary, justifyContent: 'center', alignItems: 'center' },
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
  reviewOpponent: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textTertiary, marginTop: spacing.xxs },

  // ── Head-to-head
  h2hCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.ink, padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  h2hTitle: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.xxs,
    letterSpacing: 1.2, textTransform: 'uppercase',
    color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md,
  },
  h2hRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  h2hPlayer: { flex: 1, alignItems: 'center' },
  h2hName: {
    fontFamily: fontFamily.bodyBold, fontSize: fontSize.body,
    color: colors.ink, marginBottom: spacing.xs,
  },
  h2hNameWinner: { color: colors.success },
  h2hScore: {
    fontFamily: fontFamily.display, fontSize: fontSize.title,
    color: colors.ink, letterSpacing: -0.5,
  },
  h2hTime: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.textTertiary, marginTop: spacing.xxs,
  },
  h2hVs: {
    width: 40, height: 40, borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  h2hVsText: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.sm,
    color: colors.textTertiary, textTransform: 'uppercase',
  },
  h2hResult: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.lg,
    letterSpacing: 0.8, textTransform: 'uppercase',
    textAlign: 'center', marginTop: spacing.md,
  },

  // ── Challenge button
  challengeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.ink,
    borderRadius: borderRadius.lg, paddingVertical: 14, marginBottom: spacing.md,
  },
  challengeButtonTitle: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.caption,
    letterSpacing: 0.5, textTransform: 'uppercase', color: colors.ink,
  },

  // ── Challenge modal
  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 360,
  },
  modalTitle: {
    fontFamily: fontFamily.bodyBold, fontSize: fontSize.body,
    color: colors.ink, textAlign: 'center', marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md,
    fontFamily: fontFamily.body, fontSize: fontSize.body,
    color: colors.text, textAlign: 'center', marginBottom: spacing.md,
  },
  modalShare: {
    paddingVertical: 14, alignItems: 'center',
    borderRadius: borderRadius.md, backgroundColor: colors.goldBright,
  },
  modalShareDisabled: { backgroundColor: colors.textTertiary },
  modalShareText: {
    fontFamily: fontFamily.uiLabel, fontSize: fontSize.caption,
    letterSpacing: 0.5, textTransform: 'uppercase', color: colors.playText,
  },
});
