import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { spacing, typography, fontFamily, fontSize, buildButtons, borderRadius, APP_URL, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getStreakFromResults, generateDailyShareGrid, generateShareGrid, getDailyNumber } from '../utils/gameEngine';
import { updateStats, updateFlagResults, saveDailyChallenge, incrementDailyChallenges, markShared, saveBaselineResult, getStats, getFlagStats, getDayStreakInfo, getBadgeData, persistEarnedBadges, getMissedFlagIds, addGameHistoryEntry, getChallengeName, saveChallengeName, addChallengeToHistory, recordRegionScore, getPersistedLevel, persistLevel } from '../utils/storage';
import { BaselineRegionId, UserStats, GameMode, CategoryId, BASELINE_REGIONS } from '../types';
import { t } from '../utils/i18n';
import { hapticCorrect, hapticTap, playCelebrationSound } from '../utils/feedback';
import { FlagImageSmall } from '../components/FlagImage';
import { CheckIcon, CrossIcon, ChevronRightIcon, BarChartIcon, CalendarIcon, UsersIcon, CrosshairIcon, BadgeIconView } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import { countCorrect } from '../utils/gameHelpers';
import { RootStackParamList } from '../types/navigation';
import { getAllEarnedBadges, detectPerGameBadges, buildBadgeContext, BADGES, TIER_COLORS, EarnedBadge } from '../utils/badges';
import { getTotalFlagCount, getCategoryCount } from '../data';
import { computeLevelProgress, getTierLabel, getLevelTier } from '../utils/levels';
import { encodeChallenge, ChallengeData, CHALLENGE_MODES, generateShortCode, generateChallengeShareCard, encodeResponse } from '../utils/challengeCode';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export default function ResultsScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const avgTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.timeTaken, 0) / results.length / 1000 * 10) / 10
    : 0;
  const isPerfect = accuracy === 100 && results.length > 0;

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
  // Phase 2: Score line fade
  const scoreFade = useRef(new Animated.Value(0)).current;
  // Phase 4: Timeline dots (staggered springs)
  const dotAnims = useRef(results.map(() => new Animated.Value(0))).current;
  // Phase 5: Stats row
  const statsFade = useRef(new Animated.Value(0)).current;
  // Phase 6: Everything else
  const restFade = useRef(new Animated.Value(0)).current;
  // Perfect celebration + hero glow for great scores
  const heroGlow = useRef(new Animated.Value(0)).current;
  // Review items
  const reviewAnims = useRef(results.map(() => new Animated.Value(0))).current;
  // Progress data
  const [overallStats, setOverallStats] = useState<UserStats | null>(null);
  const [dayStreakCount, setDayStreakCount] = useState(0);
  const [newBadges, setNewBadges] = useState<EarnedBadge[]>([]);
  const [totalBadgesEarned, setTotalBadgesEarned] = useState(0);
  const [isNewBestStreak, setIsNewBestStreak] = useState(false);
  const [prevAccuracy, setPrevAccuracy] = useState<number | null>(null);
  const [weakFlagCount, setWeakFlagCount] = useState(0);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);

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
      ...(config.difficulty && { difficulty: config.difficulty }),
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
    const message = generateChallengeShareCard(
      hostResults,
      name,
      config.mode,
      link,
    );
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
      myResults: results.map((r) => r.correct),
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

  const doShareResponse = async () => {
    if (!challenge || !playerName) return;
    const shortCode = generateShortCode(challenge);
    const responseCode = encodeResponse({
      recipientName: playerName,
      shortCode,
      recipientScore: correct,
      totalFlags: results.length,
      resultDetails: results.map((r) => r.correct),
    });
    const link = `${APP_URL}/r/${responseCode}`;
    const message = t('challenge.responseShareCard', {
      name: playerName,
      correct: String(correct),
      total: String(results.length),
      opponent: challenge.hostName,
      link,
    });
    try {
      await Share.share({ message });
    } catch { /* share cancelled */ }
  };

  // Head-to-head comparison data
  const h2h = isChallenge && challenge ? (() => {
    const hostCorrect = challenge.hostResults.filter((r) => r.correct).length;
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
      const [preStats, preFlagStats, preDayStreakInfo, preBadgeData, preMissed] = await Promise.all([
        getStats(), getFlagStats(), getDayStreakInfo(), getBadgeData(), getMissedFlagIds(),
      ]);
      const preCtx = buildBadgeContext(preStats, preFlagStats, preDayStreakInfo, preBadgeData, preMissed.length);
      const preBadgeIds = new Set(getAllEarnedBadges(preCtx, preBadgeData.earnedBadgeIds).map((b) => b.id));

      const wasNewBestStreak = streak > preStats.bestStreak;
      const prevAcc = preStats.totalAnswered > 0
        ? Math.round((preStats.totalCorrect / preStats.totalAnswered) * 100) : null;

      // ── Persist game data ──
      if (!reviewOnly) {
        const correctResults = results.filter((r) => r.correct);
        const speedData = correctResults.length > 0
          ? { correctTimeMs: correctResults.reduce((sum, r) => sum + r.timeTaken, 0), correctCount: correctResults.length }
          : undefined;
        await updateStats(correct, results.length, streak, config.mode, config.category, speedData);
        await updateFlagResults(results);
        await addGameHistoryEntry(accuracy, config.mode);
        // Record per-region score for region-based games
        if ((BASELINE_REGIONS as readonly string[]).includes(config.category)) {
          await recordRegionScore(config.category as BaselineRegionId, correct, results.length);
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
            myResults: results.map((r) => r.correct),
            opponentResults: challenge.hostResults.map((r) => r.correct),
          });
        }
      }
      if (isBaseline) {
        const regionTotal = getCategoryCount(config.category as CategoryId);
        await saveBaselineResult(config.category as BaselineRegionId, results, regionTotal);
      }

      // ── Snapshot post-game state and evaluate badges ──
      const [postStats, postFlagStats, postDayStreakInfo, postBadgeData, postMissed] = await Promise.all([
        getStats(), getFlagStats(), getDayStreakInfo(), getBadgeData(), getMissedFlagIds(),
      ]);
      const postCtx = buildBadgeContext(postStats, postFlagStats, postDayStreakInfo, postBadgeData, postMissed.length);
      // Merge persisted IDs + per-game badges detected from results, then evaluate
      const perGameIds = !reviewOnly ? detectPerGameBadges(results, correct, results.length) : [];
      const allPersistedIds = [...postBadgeData.earnedBadgeIds, ...perGameIds];
      const postBadges = getAllEarnedBadges(postCtx, allPersistedIds);
      // Single persist call for all earned badges
      await persistEarnedBadges(postBadges.map((b) => b.id));

      setOverallStats(postStats);
      setDayStreakCount(postDayStreakInfo.current);
      setNewBadges(postBadges.filter((b) => !preBadgeIds.has(b.id)));
      setTotalBadgesEarned(postBadges.length);
      setIsNewBestStreak(wasNewBestStreak && !reviewOnly);
      setPrevAccuracy(prevAcc);
      setWeakFlagCount(postMissed.length);

      // ── Level-up detection ──
      if (!reviewOnly) {
        const prePersisted = await getPersistedLevel();
        const levelCtx = {
          stats: postStats,
          flagStats: postFlagStats,
          badgeData: { ...postBadgeData, earnedBadgeIds: postBadges.map((b) => b.id) },
          dayStreakInfo: postDayStreakInfo,
        };
        const lp = computeLevelProgress(levelCtx, prePersisted);
        if (lp.currentLevel > prePersisted) {
          await persistLevel(lp.currentLevel);
          setLevelUpTo(lp.currentLevel);
          // Only fire celebration sound if perfect-score celebration won't already play it
          if (!isPerfect) {
            hapticCorrect();
            playCelebrationSound();
          }
        }
      }
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

    // Phase 2: Score text (after count-up)
    const revealDelay = 1500;
    Animated.timing(scoreFade, {
      toValue: 1, duration: 300, delay: revealDelay, useNativeDriver: true,
    }).start();

    // Phase 3: Timeline dots (staggered)
    const dotsDelay = revealDelay + 200;
    Animated.stagger(
      60,
      dotAnims.map((a) =>
        Animated.spring(a, { toValue: 1, friction: 6, tension: 120, delay: dotsDelay, useNativeDriver: true }),
      ),
    ).start();

    // Phase 4: Stats
    Animated.timing(statsFade, {
      toValue: 1, duration: 400, delay: dotsDelay + results.length * 60 + 100, useNativeDriver: true,
    }).start();

    // Phase 5: Rest
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

    // Celebration intensity scaling (no flashing banner)
    if (isPerfect) {
      // Perfect: sound + haptic + hero glow
      setTimeout(() => {
        hapticCorrect();
        playCelebrationSound();
      }, revealDelay);
      Animated.sequence([
        Animated.timing(heroGlow, { toValue: 1, duration: 400, delay: revealDelay, useNativeDriver: false }),
        Animated.timing(heroGlow, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    } else if (accuracy >= 90) {
      // Great score: haptic + hero glow flash (gold tint)
      setTimeout(() => {
        hapticCorrect();
      }, revealDelay);
      Animated.sequence([
        Animated.timing(heroGlow, { toValue: 0.7, duration: 350, delay: revealDelay, useNativeDriver: false }),
        Animated.timing(heroGlow, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]).start();
    } else if (accuracy >= 80) {
      // Good score: light haptic
      setTimeout(() => hapticTap(), revealDelay);
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



  const navigatePlayAgain = useCallback(() => {
    if (isDaily || isBaseline) {
      navigation.popToTop();
      return;
    }
    const map: Partial<Record<GameMode, keyof RootStackParamList>> = {
      flashflag: 'FlashFlag', flagpuzzle: 'FlagPuzzle', neighbors: 'Neighbors',
      impostor: 'FlagImpostor', capitalconnection: 'CapitalConnection',
    };
    navigation.replace((map[config.mode] || 'Game') as 'Game', { config });
  }, [isDaily, isBaseline, config, navigation]);

  const playAgain = () => {
    navigatePlayAgain();
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

  const dataLoaded = overallStats !== null;
  const accDiff = prevAccuracy !== null ? accuracy - prevAccuracy : null;
  const accInsight = !dataLoaded
    ? null
    : prevAccuracy === null
    ? t('results.firstGame')
    : accDiff !== null && accDiff > 0 ? t('results.aboveAverage', { pct: accDiff })
    : accDiff !== null && accDiff < 0 ? t('results.belowAverage', { pct: Math.abs(accDiff) })
    : null;

  // Hero glow: interpolate to a warm gold border overlay
  const heroGlowColor = heroGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.goldGlow0, colors.goldGlow35],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenContainer>

        {/* Perfect banner removed */}

        {/* ══════════════════════════════════════════════════════════
            HERO: The score reveal. This IS the experience.
            Phase 1: accuracy counts up  0% → 87%
            Phase 2: "8/10 correct" fades in
            Hidden for challenge mode — h2h card is the hero instead.
            ══════════════════════════════════════════════════════════ */}
        {!isChallenge && (
        <Animated.View style={[styles.heroCard, { borderColor: heroGlowColor, borderWidth: 2 }]}>
          <Text style={styles.heroEyebrow}>
            {isDaily ? t('results.dailyTitle', { number: dailyNumber }) : modeLabel}
          </Text>

          {/* Count-up number */}
          <Text style={styles.heroAccuracy}>{displayAcc}%</Text>

          {/* Score line */}
          <Animated.Text style={[styles.heroScoreText, { opacity: scoreFade }]}>
            {correct}/{questionTotal} {t('results.correct').toLowerCase()}
          </Animated.Text>
        </Animated.View>
        )}

        {/* ── HEAD-TO-HEAD (challenge mode) ── */}
        {h2h && challenge && (
          <Animated.View style={[styles.h2hCard, {
            opacity: scoreFade,
            borderColor: h2h.winner === 'player' ? colors.success
              : h2h.winner === 'host' ? colors.error
              : colors.goldBright,
          }]}>
            {/* Result banner */}
            <View style={[styles.h2hBanner, {
              backgroundColor: h2h.winner === 'player' ? colors.success + '18'
                : h2h.winner === 'host' ? colors.error + '18'
                : colors.goldBright + '18',
            }]}>
              <Text style={[styles.h2hBannerText, {
                color: h2h.winner === 'player' ? colors.success
                  : h2h.winner === 'host' ? colors.error
                  : colors.goldBright,
              }]}>
                {h2h.winner === 'player' ? t('challenge.youWin')
                  : h2h.winner === 'host' ? t('challenge.theyWin', { name: challenge.hostName })
                  : t('challenge.tie')}
              </Text>
            </View>

            <Text style={styles.h2hTitle}>{t('challenge.headToHead')}</Text>

            <View style={styles.h2hRow}>
              {/* Player side */}
              <View style={styles.h2hPlayer}>
                <Text style={[
                  styles.h2hName,
                  h2h.winner === 'player' && styles.h2hNameWinner,
                ]}>{playerName || t('challenge.you')}</Text>
                <Text style={[styles.h2hScoreBig, h2h.winner === 'player' && { color: colors.success }]}>{h2h.playerCorrect}</Text>
                <Text style={styles.h2hScoreSub}>/{h2h.h2hTotal}</Text>
                <Text style={styles.h2hTime}>{h2h.playerAvg}s avg</Text>
              </View>

              {/* VS circle */}
              <View style={styles.h2hVs}>
                <Text style={styles.h2hVsText}>VS</Text>
              </View>

              {/* Host side */}
              <View style={styles.h2hPlayer}>
                <Text style={[
                  styles.h2hName,
                  h2h.winner === 'host' && styles.h2hNameWinner,
                ]}>{challenge.hostName}</Text>
                <Text style={[styles.h2hScoreBig, h2h.winner === 'host' && { color: colors.success }]}>{h2h.hostCorrect}</Text>
                <Text style={styles.h2hScoreSub}>/{h2h.h2hTotal}</Text>
                <Text style={styles.h2hTime}>{h2h.hostAvg}s avg</Text>
              </View>
            </View>

            {/* Per-flag comparison dots */}
            <View style={styles.h2hDotsSection}>
              <View style={styles.h2hDotsRow}>
                {results.map((r, i) => {
                  const hostR = challenge.hostResults[i];
                  const playerWon = r.correct && (!hostR || !hostR.correct);
                  const hostWon = (!r.correct) && hostR?.correct;
                  return (
                    <View key={i} style={styles.h2hDotPair}>
                      <View style={[styles.h2hDotSmall,
                        r.correct ? styles.h2hDotCorrect : styles.h2hDotWrong,
                        playerWon && styles.h2hDotWin,
                      ]} />
                      <View style={[styles.h2hDotSmall,
                        hostR?.correct ? styles.h2hDotCorrect : styles.h2hDotWrong,
                        hostWon && styles.h2hDotWin,
                      ]} />
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── SEND RESULTS BACK (for received challenges — shown first) ── */}
        {isChallenge && challenge && playerName && !reviewOnly && (
          <Animated.View style={{ opacity: scoreFade }}>
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={() => { hapticTap(); doShareResponse(); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('challenge.sendResultsBack')}
            >
              <View style={styles.challengeButtonInner}>
                <UsersIcon size={18} color={colors.goldBright} />
                <View style={styles.challengeButtonContent}>
                  <Text style={styles.challengeButtonTitle}>{t('challenge.sendResultsBack')}</Text>
                  <Text style={styles.challengeButtonDesc}>{t('challenge.sendResultsBackDesc')}</Text>
                </View>
                <ChevronRightIcon size={14} color={colors.goldBright} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── CHALLENGE BACK (after send results) ── */}
        {isChallenge && canChallenge && !reviewOnly && (
          <Animated.View style={{ opacity: scoreFade }}>
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={() => { hapticTap(); navigation.replace('GameSetup', { initialMode: config.mode, ...(config.difficulty && { initialDifficulty: config.difficulty }) }); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('challenge.challengeBack')}
            >
              <View style={styles.challengeButtonInner}>
                <UsersIcon size={18} color={colors.goldBright} />
                <View style={styles.challengeButtonContent}>
                  <Text style={styles.challengeButtonTitle}>{t('challenge.challengeBack')}</Text>
                  <Text style={styles.challengeButtonDesc}>{t('challenge.challengeBackDesc')}</Text>
                </View>
                <ChevronRightIcon size={14} color={colors.goldBright} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════
            STREAK TIMELINE: Dots appear one-by-one showing the flow
            Hidden for challenges — h2h card has comparison dots already.
            ══════════════════════════════════════════════════════════ */}
        {!isChallenge && <View style={styles.timelineCard}>
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
        </View>}

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

        {/* ── INSIGHT CHIPS (hidden for challenges) ── */}
        {!reviewOnly && !isChallenge && (
          <Animated.View style={[styles.insightRow, { opacity: restFade }]}>
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

        {/* ── ACTION BUTTONS (hidden for challenges — they have Send Results + Challenge Again) ── */}
        {!isChallenge && (
        <Animated.View style={[styles.buttonRow, { opacity: restFade }]}>
          <TouchableOpacity style={[styles.primaryButton, !isBaseline && styles.buttonHalf]} onPress={playAgain} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={playCtaText}>
            <Text style={styles.primaryButtonText}>{playCtaText}</Text>
          </TouchableOpacity>
          {!isBaseline && (
            <TouchableOpacity style={[styles.secondaryButton, styles.buttonHalf]} onPress={handleShare} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.share')}>
              <Text style={styles.secondaryButtonText}>{t('common.share')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        )}

        {/* ── CHALLENGE A FRIEND ── */}
        {canChallenge && !isChallenge && !reviewOnly && (
          <Animated.View style={{ opacity: restFade }}>
            <TouchableOpacity
              style={styles.challengeShareButton}
              onPress={handleChallengeTap}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('challenge.challengeFriend')}
            >
              <UsersIcon size={16} color={colors.goldBright} />
              <Text style={styles.challengeShareText}>{t('challenge.challengeFriend')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}


        {/* ── NEWLY EARNED BADGES (hidden for challenges) ── */}
        {newBadges.length > 0 && !isChallenge && (
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

        {/* ── YOUR PROGRESS (animated bar) — hidden for challenges ── */}
        {overallStats && !reviewOnly && !isChallenge && (
          <Animated.View style={[styles.progressSection, { opacity: restFade }]}>

            {weakFlagCount > 0 && (
              <TouchableOpacity
                style={styles.practiceButton}
                onPress={() => navigation.replace('Game', {
                  config: { mode: 'practice', category: 'all', questionCount: weakFlagCount, displayMode: 'flag' },
                })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('results.practiceWeak')}
                accessibilityHint={t('results.flagsToReview', { count: weakFlagCount })}
              >
                <CrosshairIcon size={16} color={colors.accent} />
                <Text style={styles.practiceButtonText}>{t('results.practiceWeak')}</Text>
                <Text style={styles.practiceButtonMeta}>{t('results.flagsToReview', { count: weakFlagCount })}</Text>
                <ChevronRightIcon size={14} color={colors.accent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.viewStatsButton} onPress={() => navigation.navigate('Stats')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('results.viewAllStats')}>
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
          {isChallenge && challenge && (
            <View style={styles.reviewH2hHeader}>
              <Text style={styles.reviewH2hLabel}>{playerName || t('challenge.you')}</Text>
              <Text style={styles.reviewH2hLabel}>{challenge.hostName}</Text>
            </View>
          )}
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
              {/* Yours vs Theirs icons for challenge mode */}
              {isChallenge && opponentResult !== undefined && (
                <View style={styles.reviewH2hIcons}>
                  {result.correct ? <CheckIcon size={14} color={colors.success} /> : <CrossIcon size={14} color={colors.error} />}
                </View>
              )}
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
              </View>
              {isChallenge && opponentResult !== undefined ? (
                <View style={styles.reviewH2hIcons}>
                  {opponentResult.correct ? <CheckIcon size={14} color={colors.success} /> : <CrossIcon size={14} color={colors.error} />}
                </View>
              ) : (
                <View style={styles.reviewRight}>
                  <Text style={[styles.reviewTime, isFastest && styles.reviewTimeFastest]}>{itemTime}s</Text>
                  {result.correct ? <CheckIcon size={18} color={colors.success} /> : <CrossIcon size={18} color={colors.error} />}
                </View>
              )}
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
          accessibilityRole="button"
          accessibilityLabel={t('common.closeDialog')}
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
              accessibilityLabel={t('challenge.enterName')}
            />
            <TouchableOpacity
              style={[styles.modalShare, challengeName.trim().length === 0 && styles.modalShareDisabled]}
              onPress={handleChallengeShare}
              disabled={challengeName.trim().length === 0}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.share')}
              accessibilityState={{ disabled: challengeName.trim().length === 0 }}
            >
              <Text style={styles.modalShareText}>{t('common.share')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Level-up celebration modal ── */}
      <Modal
        visible={levelUpTo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLevelUpTo(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLevelUpTo(null)}
          accessibilityRole="button"
          accessibilityLabel={t('common.closeDialog')}
        >
          <TouchableOpacity activeOpacity={1} style={styles.levelUpCard} onPress={() => {}}>
            <Text style={styles.levelUpTitle}>{t('stats.levelUp')}</Text>
            <Text style={styles.levelUpNumber}>{levelUpTo}</Text>
            <Text style={styles.levelUpTier}>{getTierLabel(getLevelTier(levelUpTo ?? 1))}</Text>
            <Text style={styles.levelUpDesc}>{t('stats.levelReached', { level: levelUpTo })}</Text>
            <TouchableOpacity
              style={styles.levelUpButton}
              onPress={() => setLevelUpTo(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.next')}
            >
              <Text style={styles.levelUpButtonText}>{t('common.next')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const createStyles = (colors: ThemeColors) => { const btn = buildButtons(colors); return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

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
    ...typography.eyebrow,
    color: colors.whiteAlpha45, marginBottom: spacing.lg,
  },
  heroAccuracy: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.countdown, // 120px - THE number
    color: colors.white,
    letterSpacing: -3,
    lineHeight: 120,
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
    ...typography.statValue, color: colors.ink,
  },
  timelineStatUnit: {
    ...typography.captionBold, color: colors.textTertiary,
  },
  timelineStatLabel: {
    ...typography.eyebrow,
    color: colors.textTertiary, marginTop: spacing.xxs,
  },
  newBestPill: {
    backgroundColor: colors.accentBg, borderRadius: borderRadius.full,
    paddingVertical: 2, paddingHorizontal: 8, marginTop: spacing.xxs,
  },
  newBestPillText: {
    ...typography.eyebrow, color: colors.accent,
  },

  // ── Daily Grid
  dailyGridCard: {
    backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm,
  },
  dailyGridTitle: {
    ...typography.eyebrow,
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
  insightText: { ...typography.microMedium, color: colors.textSecondary },

  // ── Buttons
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  buttonHalf: { flex: 1 },
  secondaryButton: { ...btn.secondary, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { ...btn.secondaryText, textAlign: 'center' },
  primaryButton: { ...btn.primary, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { ...btn.primaryText, textAlign: 'center' },

  // ── Badges
  badgesSection: { marginBottom: spacing.md },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 6, gap: 12,
  },
  badgeIconWrap: { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  badgeContent: { flex: 1 },
  badgeName: { ...typography.captionStrong, color: colors.ink, marginBottom: 2 },
  badgeDesc: { ...typography.micro, color: colors.textSecondary },
  badgeTierPill: { borderRadius: borderRadius.full, paddingVertical: 3, paddingHorizontal: 10 },
  badgeTierText: { ...typography.eyebrow },

  // ── Actions
  progressSection: { marginBottom: spacing.md },
  practiceButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accentBg, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.accent, padding: 14, marginBottom: 8,
  },
  practiceButtonText: {
    ...typography.actionLabel, letterSpacing: 0.8, color: colors.accent,
  },
  practiceButtonMeta: {
    ...typography.micro,
    color: colors.textTertiary, flex: 1, textAlign: 'right',
  },
  viewStatsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 14,
  },
  viewStatsText: {
    ...typography.actionLabel, letterSpacing: 0.8, color: colors.ink, flex: 1,
  },

  // ── Sections
  sectionHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.eyebrow, color: colors.textTertiary,
  },
  sectionMeta: { ...typography.micro, color: colors.textTertiary },

  // ── Review
  reviewItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: 12, paddingHorizontal: 14, marginBottom: 6,
    borderLeftWidth: 4, borderRadius: borderRadius.md, gap: 12,
  },
  reviewCorrect: { borderLeftColor: colors.success },
  reviewWrong: { borderLeftColor: colors.error },
  reviewIndex: { fontFamily: fontFamily.display, fontSize: fontSize.sm, minWidth: 18, textAlign: 'center' },
  reviewIndexCorrect: { color: colors.success },
  reviewIndexWrong: { color: colors.error },
  reviewContent: { flex: 1 },
  reviewName: { ...typography.bodyBold, color: colors.text },
  reviewAnswer: { ...typography.micro, color: colors.error, marginTop: spacing.xxs },
  reviewRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewTime: { ...typography.microMedium, color: colors.textTertiary },
  reviewTimeFastest: { color: colors.success },
  reviewH2hHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, marginBottom: spacing.xs,
  },
  reviewH2hLabel: {
    ...typography.eyebrow, color: colors.textTertiary,
  },
  reviewH2hIcons: {
    width: 24, alignItems: 'center', justifyContent: 'center',
  },

  // ── Head-to-head
  h2hCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 2, padding: spacing.lg,
    marginBottom: spacing.sm, overflow: 'hidden',
  },
  h2hBanner: {
    paddingVertical: spacing.sm,
    marginTop: -spacing.lg,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  h2hBannerText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  h2hTitle: {
    ...typography.eyebrow,
    color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md,
  },
  h2hRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  h2hPlayer: { flex: 1, alignItems: 'center' },
  h2hName: {
    ...typography.microMedium,
    color: colors.ink, marginBottom: spacing.xs,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  h2hNameWinner: { color: colors.success },
  h2hScoreBig: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 48,
  },
  h2hScoreSub: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: -4,
  },
  h2hTime: {
    ...typography.micro,
    color: colors.textTertiary, marginTop: spacing.xs,
  },
  h2hVs: {
    width: 36, height: 36, borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  h2hVsText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.textTertiary,
  },
  h2hDotsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  h2hDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  h2hDotPair: {
    alignItems: 'center',
    gap: 2,
  },
  h2hDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  h2hDotCorrect: {
    backgroundColor: colors.success + '60',
  },
  h2hDotWrong: {
    backgroundColor: colors.error + '60',
  },
  h2hDotWin: {
    backgroundColor: colors.success,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Challenge button
  challengeShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.goldBright,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  challengeShareText: {
    ...typography.bodyBold,
    color: colors.goldBright,
  },
  challengeButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.goldBright + '50',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  challengeButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  challengeButtonContent: {
    flex: 1,
  },
  challengeButtonTitle: {
    ...typography.bodyBold,
    color: colors.goldBright,
    marginBottom: 2,
  },
  challengeButtonDesc: {
    ...typography.micro,
    color: colors.textTertiary,
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
    ...typography.bodyBold,
    color: colors.ink, textAlign: 'center', marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md,
    ...typography.body,
    color: colors.text, textAlign: 'center', marginBottom: spacing.md,
  },
  modalShare: {
    paddingVertical: 14, alignItems: 'center',
    borderRadius: borderRadius.md, backgroundColor: colors.goldBright,
  },
  modalShareDisabled: { backgroundColor: colors.textTertiary },
  modalShareText: {
    ...typography.actionLabel, color: colors.playText,
  },

  // ── Level-up celebration
  levelUpCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 320,
    alignItems: 'center', borderWidth: 2, borderColor: colors.goldBright,
  },
  levelUpTitle: {
    ...typography.eyebrow, color: colors.goldBright,
    letterSpacing: 1.5, marginBottom: spacing.sm,
  },
  levelUpNumber: {
    fontFamily: fontFamily.display, fontSize: 56,
    color: colors.goldBright, lineHeight: 64,
  },
  levelUpTier: {
    ...typography.bodyBold, color: colors.textSecondary,
    marginTop: spacing.xxs, marginBottom: spacing.md,
  },
  levelUpDesc: {
    ...typography.body, color: colors.text,
    textAlign: 'center', marginBottom: spacing.lg,
  },
  levelUpButton: {
    paddingVertical: 14, paddingHorizontal: spacing.xxl,
    alignItems: 'center', borderRadius: borderRadius.md,
    backgroundColor: colors.goldBright,
  },
  levelUpButtonText: {
    ...typography.actionLabel, color: colors.playText,
  },
}); };
