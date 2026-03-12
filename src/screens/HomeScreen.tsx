import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontFamily, fontSize, spacing, borderRadius, shadows, buttons, screenContainer } from '../utils/theme';
import { getTotalFlagCount, getCategoryCount } from '../data';
import { initAudio, hapticTap, hapticCorrect, hapticWrong, playWrongSound, setSoundsEnabled, setHapticsEnabled } from '../utils/feedback';
import { getStats, getDayStreak, getSettings, getMissedFlagIds, getBaselineData, BaselineData } from '../utils/storage';
import { generateQuestions } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { GameMode, UserStats, GameQuestion, CategoryId } from '../types';
import { PlayIcon, ChevronRightIcon, ChevronDownIcon, ClockIcon, EyeIcon, CrosshairIcon, GearIcon, PuzzleIcon, CheckIcon } from '../components/Icons';
import FlagImage from '../components/FlagImage';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import SegBtn from '../components/SegBtn';
import ConfigRow, { ConfigCard } from '../components/ConfigRow';
import { useNavTabs } from '../hooks/useNavTabs';
import SupportCard from '../components/SupportCard';
import { preloadRewardedAd } from '../utils/ads';
import { t } from '../utils/i18n';
import { translateName, flagName } from '../data/countryNames';

const MODE_KEYS: GameMode[] = ['easy', 'medium', 'hard'];

const QUESTION_COUNTS = [5, 10, 15, 20];




type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Flag Teaser (inline mini-quiz) ─────────────────────────
function FlagTeaser({ onAnswer }: { onAnswer?: () => void }) {
  const question = useMemo<GameQuestion | null>(() => {
    const qs = generateQuestions({ mode: 'medium', category: 'all', questionCount: 1, displayMode: 'flag' });
    return qs[0] ?? null;
  }, []);

  const [picked, setPicked] = useState<string | null>(null);
  const optAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Pop in options after a short delay
    const timer = setTimeout(() => {
      Animated.stagger(
        100,
        optAnims.map((a) =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }),
        ),
      ).start();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  if (!question) return null;

  const handlePick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === question.flag.name) {
      hapticCorrect();
    } else {
      hapticWrong();
      playWrongSound();
    }
    onAnswer?.();
  };

  const renderOption = (opt: string, idx: number) => {
    const isCorrect = opt === question.flag.name;
    const isSelected = picked === opt;
    const showCorrect = picked !== null && isCorrect;
    const showWrong = isSelected && !isCorrect;
    return (
      <Animated.View
        key={opt}
        style={[
          styles.optWrap,
          { opacity: optAnims[idx], transform: [{ scale: optAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.optBtn, showCorrect && styles.optCorrect, showWrong && styles.optWrong]}
          onPress={() => handlePick(opt)}
          activeOpacity={0.8}
          disabled={picked !== null}
        >
          <Text style={[styles.optText, showCorrect && styles.optTextCorrect, showWrong && styles.optTextWrong]}>{translateName(opt)}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroLabel}>{t('home.nameThisFlag')}</Text>
      <View style={styles.flagWrap}>
        <FlagImage
          countryCode={question.flag.id}
          size="hero"
          style={{ width: '100%' }}
        />
      </View>

      {/* Options 2x2 — stay visible after pick to show correct/wrong highlights */}
      <View style={styles.optsGrid}>
        <View style={styles.optsRow}>
          {question.options.slice(0, 2).map((opt, i) => renderOption(opt, i))}
        </View>
        <View style={styles.optsRow}>
          {question.options.slice(2, 4).map((opt, i) => renderOption(opt, i + 2))}
        </View>
      </View>

      {/* Result label appears after pick */}
      {picked && (
        <View style={styles.teaserResult}>
          <Text style={[styles.teaserResultText, picked === question.flag.name ? styles.teaserResultCorrect : styles.teaserResultWrong]}>
            {picked === question.flag.name ? t('common.correct') : flagName(question.flag)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const onNavigate = useNavTabs();
  const totalFlags = getTotalFlagCount();
  const [mode, setMode] = useState<GameMode>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dayStreak, setDayStreak] = useState(0);
  const [teaserKey, setTeaserKey] = useState(0);
  const [weakFlagCount, setWeakFlagCount] = useState(0);
  const [autocomplete, setAutocomplete] = useState(false);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const playBtnScale = useRef(new Animated.Value(1)).current;

  const pulsePlayBtn = useCallback(() => {
    Animated.sequence([
      Animated.timing(playBtnScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
      Animated.spring(playBtnScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
    ]).start();
  }, [playBtnScale]);

  useEffect(() => {
    initAudio();
    preloadRewardedAd();
    getSettings().then((s) => {
      setSoundsEnabled(s.soundEnabled);
      setHapticsEnabled(s.hapticsEnabled);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
      getDayStreak().then(setDayStreak);
      getMissedFlagIds().then((ids) => setWeakFlagCount(ids.length));
      getBaselineData().then(setBaseline);
      setTeaserKey((k) => k + 1);
    }, []),
  );

  const play = () => {
    hapticTap();
    navigation.navigate('Game', {
      config: { mode, category: 'all', questionCount: questionCountAll ? totalFlags : questionCount, displayMode: 'flag', ...(mode === 'hard' && { autocomplete }) },
    });
  };

  const ONBOARDING_REGIONS = ['africa', 'asia', 'europe', 'americas', 'oceania'] as const;
  const onboardingComplete = baseline ? baseline.completedAt !== null : true;
  const onboardingCount = baseline ? ONBOARDING_REGIONS.filter((r) => baseline.regions[r]).length : 0;
  const nextRegion = baseline ? ONBOARDING_REGIONS.find((r) => !baseline.regions[r]) ?? 'africa' : 'africa';


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenContainer>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>
            <Text style={styles.wmFlag}>Flag</Text>
            <Text style={styles.wmThat}>That</Text>
          </Text>
          {dayStreak > 0 ? (
            <TouchableOpacity
              style={styles.streakBadge}
              onPress={() => navigation.navigate('Stats')}
              activeOpacity={0.7}
            >
              <Text style={styles.streakNum}>{dayStreak}</Text>
              <View style={styles.streakMeta}>
                <Text style={styles.streakLabel}>{t('home.dayStreak')}</Text>
                <View style={styles.streakPips}>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <View key={i} style={[styles.pip, i < Math.min(dayStreak, 7) && styles.pipLit]} />
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.6}
            >
              <GearIcon size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── FLAG TEASER ── */}
        <FlagTeaser key={teaserKey} onAnswer={pulsePlayBtn} />

        {/* ── PLAY NOW ── */}
        <Animated.View style={[styles.playWrap, { transform: [{ scale: playBtnScale }] }]}>
          <TouchableOpacity style={styles.playBtn} onPress={play} activeOpacity={0.85}>
            <Text style={styles.playBtnText}>{t('home.playNow')}</Text>
            <PlayIcon size={14} color={colors.playText} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── CONFIG ── */}
        <View style={{ marginHorizontal: spacing.md, marginTop: spacing.sm }}>
          <ConfigCard>
            <ConfigRow label={t('home.cards')} showDivider={false}>
              {QUESTION_COUNTS.map((c) => (
                <SegBtn
                  key={c}
                  label={String(c)}
                  active={!questionCountAll && questionCount === c}
                  onPress={() => { setQuestionCount(c); setQuestionCountAll(false); }}
                  maxWidth={54}
                />
              ))}
              <SegBtn
                label={t('common.all')}
                active={questionCountAll}
                onPress={() => setQuestionCountAll(true)}
                maxWidth={54}
              />
            </ConfigRow>
            <ConfigRow label={t('home.difficulty')}>
              {MODE_KEYS.map((m) => (
                <SegBtn
                  key={m}
                  label={t(`common.${m}`)}
                  active={mode === m}
                  onPress={() => setMode(m)}
                  maxWidth={54}
                />
              ))}
            </ConfigRow>
            {mode === 'hard' && (
              <ConfigRow label={t('home.hints')}>
                <SegBtn
                  label={t('common.off')}
                  active={!autocomplete}
                  onPress={() => setAutocomplete(false)}
                  maxWidth={54}
                />
                <SegBtn
                  label={t('common.on')}
                  active={autocomplete}
                  onPress={() => setAutocomplete(true)}
                  maxWidth={54}
                />
              </ConfigRow>
            )}
          </ConfigCard>
        </View>

        {/* ── GAME MODES ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLbl}>{t('home.gameModes')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('GameSetup')} activeOpacity={0.7}>
              <Text style={styles.sectionAll}>{t('common.all')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeList}>
            <TouchableOpacity
              style={styles.modeRow}
              activeOpacity={0.85}
              onPress={() => {
                hapticTap();
                navigation.navigate('Game', {
                  config: { mode: 'timeattack', category: 'all', questionCount: 999, timeLimit: 60, displayMode: 'flag' },
                });
              }}
            >
              <View style={[styles.modeBar, { backgroundColor: colors.modeRed }]} />
              <Text style={styles.modeTitle}>{t('home.timedQuiz')}</Text>
              <Text style={styles.modeTag}>{t('home.timedQuizTag')}</Text>
              <ChevronRightIcon size={14} color={colors.dim} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeRow}
              activeOpacity={0.85}
              onPress={() => {
                hapticTap();
                navigation.navigate('FlagImpostor', {
                  config: { mode: 'impostor', category: 'all', questionCount: 10, displayMode: 'flag' },
                });
              }}
            >
              <View style={[styles.modeBar, { backgroundColor: colors.modeGreen }]} />
              <Text style={styles.modeTitle}>{t('home.flagImpostor')}</Text>
              <Text style={styles.modeTag}>{t('home.flagImpostorDesc')}</Text>
              <ChevronRightIcon size={14} color={colors.dim} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeRow}
              activeOpacity={0.85}
              onPress={() => {
                hapticTap();
                navigation.navigate('FlagPuzzle', {
                  config: { mode: 'flagpuzzle', category: 'all', questionCount: 10, timeLimit: 15, displayMode: 'flag' },
                });
              }}
            >
              <View style={[styles.modeBar, { backgroundColor: colors.modePurple }]} />
              <Text style={styles.modeTitle}>{t('setup.flagPuzzle')}</Text>
              <Text style={styles.modeTag}>{t('setup.flagPuzzleDesc')}</Text>
              <ChevronRightIcon size={14} color={colors.dim} />
            </TouchableOpacity>

            {weakFlagCount > 0 && (
              <TouchableOpacity
                style={styles.modeRow}
                activeOpacity={0.85}
                onPress={() => {
                  hapticTap();
                  navigation.navigate('Game', {
                    config: { mode: 'practice', category: 'all', questionCount: weakFlagCount, displayMode: 'flag' },
                  });
                }}
              >
                <View style={[styles.modeBar, { backgroundColor: colors.modeRed }]} />
                <Text style={[styles.modeTitle, { color: colors.red }]}>{t('home.practiceWeak')}</Text>
                <Text style={styles.modeTag}>{weakFlagCount === 1 ? t('home.flagsToReview', { count: weakFlagCount }) : t('home.flagsToReviewPlural', { count: weakFlagCount })}</Text>
                <ChevronRightIcon size={14} color={colors.dim} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── SUPPORT ── */}
        <SupportCard gamesPlayed={stats?.totalGamesPlayed ?? 0} />

        {/* ── ONBOARDING PROGRESS (at bottom until complete) ── */}
        {!onboardingComplete && (
          <View style={styles.onboardingWrap}>
            <View style={styles.onboardingTop}>
              <View style={styles.onboardingTopLeft}>
                <Text style={styles.onboardingTitle}>{t('onboarding.baselineProgress')}</Text>
                <Text style={styles.onboardingCount}>
                  {t('onboarding.regionsComplete', { count: onboardingCount, total: ONBOARDING_REGIONS.length })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.onboardingCta}
                activeOpacity={0.85}
                onPress={() => {
                  hapticTap();
                  const count = getCategoryCount(nextRegion as CategoryId);
                  navigation.navigate('Game', {
                    config: { mode: 'baseline', category: nextRegion as CategoryId, questionCount: count, displayMode: 'flag' },
                  });
                }}
              >
                <Text style={styles.onboardingCtaText}>{t(`categories.${nextRegion}`)}</Text>
                <ChevronRightIcon size={14} color={colors.playText} />
              </TouchableOpacity>
            </View>
            <View style={styles.onboardingBarRow}>
              <View style={styles.onboardingBar}>
                <Animated.View
                  style={[
                    styles.onboardingBarFill,
                    { width: `${(onboardingCount / ONBOARDING_REGIONS.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.onboardingMotivation}>{t('onboarding.baselineMotivation')}</Text>
            </View>
            {/* Region chips */}
            <View style={styles.onboardingChips}>
              {ONBOARDING_REGIONS.map((r) => {
                const result = baseline?.regions[r];
                const isDone = !!result;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.onboardingChip,
                      isDone ? styles.onboardingChipDone : styles.onboardingChipPending,
                    ]}
                    activeOpacity={isDone ? 1 : 0.7}
                    disabled={isDone}
                    onPress={() => {
                      hapticTap();
                      const count = getCategoryCount(r as CategoryId);
                      navigation.navigate('Game', {
                        config: { mode: 'baseline', category: r as CategoryId, questionCount: count, displayMode: 'flag' },
                      });
                    }}
                  >
                    {isDone && <CheckIcon size={10} color={colors.success} />}
                    <Text style={[
                      styles.onboardingChipText,
                      isDone ? styles.onboardingChipTextDone : styles.onboardingChipTextPending,
                    ]}>
                      {t(`categories.${r}`)}
                    </Text>
                    {isDone && <Text style={styles.onboardingChipPct}>{result!.accuracy}%</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: spacing.md }} />
        </ScreenContainer>
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <BottomNav activeTab="Home" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: screenContainer,
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  wordmark: {
    lineHeight: 28,
  },
  wmFlag: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.heading + 1,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  wmThat: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.heading + 1,
    color: colors.goldBright,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
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
    fontSize: fontSize.xl,
    color: colors.goldBright,
    letterSpacing: -0.8,
    lineHeight: 22,
  },
  streakMeta: {
    gap: 3,
  },
  streakLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.micro,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    lineHeight: 10,
  },
  streakPips: {
    flexDirection: 'row',
    gap: 3,
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
  settingsBtn: {
    padding: spacing.sm,
  },

  // ── Onboarding progress
  onboardingWrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  onboardingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onboardingTopLeft: {
    flex: 1,
  },
  onboardingTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.body,
    color: colors.ink,
    marginBottom: 2,
  },
  onboardingCount: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  onboardingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.goldBright,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  onboardingCtaText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.playText,
  },
  onboardingBarRow: {
    gap: spacing.xs,
  },
  onboardingBar: {
    height: 6,
    backgroundColor: colors.rule,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  onboardingBarFill: {
    height: 6,
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  onboardingMotivation: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xxs,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  onboardingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  onboardingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  onboardingChipDone: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  onboardingChipPending: {
    backgroundColor: colors.goldAlpha15,
    borderColor: colors.goldBright,
  },
  onboardingChipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  onboardingChipTextDone: {
    color: colors.success,
  },
  onboardingChipTextPending: {
    color: colors.goldBright,
  },
  onboardingChipPct: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.success,
  },

  // ── Hero flag teaser (light mode - no dark background)
  heroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  heroLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  flagWrap: {
    width: '100%',
    aspectRatio: 3 / 2,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },

  // Options 2x2
  optsGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  optsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optWrap: {
    flex: 1,
  },
  optBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  optCorrect: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  optWrong: {
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
  },
  optText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.ink,
    textAlign: 'center',
  },
  optTextCorrect: {
    color: colors.success,
  },
  optTextWrong: {
    color: colors.error,
  },

  // ── Teaser result
  teaserResult: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  teaserResultText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.lg,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  teaserResultCorrect: {
    color: colors.success,
  },
  teaserResultWrong: {
    color: colors.ink,
    fontSize: fontSize.xl,
  },
  // ── Play button
  playWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  playBtn: {
    ...buttons.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 15,
  },
  playBtnText: {
    ...buttons.primaryText,
  },

  // ── Game modes
  sectionWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionLbl: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg + 1,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  sectionAll: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  modeList: {},
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  modeTitle: {
    flex: 1,
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.caption,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  modeTag: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm - 1,
    color: colors.textTertiary,
  },

});
