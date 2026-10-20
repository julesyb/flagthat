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
import { fontFamily, fontSize, spacing, borderRadius, buildButtons, typography, layout } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/theme';
import { getTotalFlagCount, getCategoryCount } from '../data';
import { initAudio, hapticTap, hapticCorrect, hapticWrong, playWrongSound, setSoundsEnabled, setHapticsEnabled } from '../utils/feedback';
import { getStats, getSettings, getMissedFlagIds, getBaselineData, isDailyCompleteToday, BaselineData, getFlagStats, getBadgeData, getDayStreakInfo, getPersistedLevel, persistLevel, getSkillLevel, getDefaultDifficulty } from '../utils/storage';
import { generateQuestions, getDailyConfig, getDailyVariant } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { GameMode, UserStats, GameQuestion, CategoryId, BASELINE_REGIONS } from '../types';
import { PlayIcon, ChevronRightIcon, CheckIcon, LinkIcon, CalendarIcon, GlobeIcon, ClockIcon, PuzzleIcon, EyeIcon, CrosshairIcon } from '../components/Icons';
import FlagImage from '../components/FlagImage';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import SegBtn from '../components/SegBtn';
import ConfigRow, { ConfigCard } from '../components/ConfigRow';
import FactOfDay from '../components/FactOfDay';
import StreakPill from '../components/StreakPill';
import { useNavTabs } from '../hooks/useNavTabs';
import { computeLevelProgress } from '../utils/levels';
import { t } from '../utils/i18n';
import { translateName, flagName } from '../data/countryNames';
import { HOME_QUESTION_COUNTS, UNLIMITED_QUESTIONS, TIMEATTACK_DEFAULT_TIME } from '../utils/config';

const MODE_KEYS: GameMode[] = ['easy', 'medium', 'hard'];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// A single row in the "Game modes" list.
interface ModeItem {
  key: string;
  title: string;
  tag: string;
  icon: React.ReactNode;
  accent: string;
  onPress: () => void;
  titleColor?: string;
  disabled?: boolean;
  done?: boolean;
  a11yLabel: string;
  a11yHint?: string;
}

// ─── Flag Teaser (inline mini-quiz) ─────────────────────────
function FlagTeaser({ onAnswer }: { onAnswer?: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          accessibilityRole="button"
          accessibilityLabel={translateName(opt)}
          accessibilityState={{ disabled: picked !== null }}
        >
          <Text style={[styles.optText, showCorrect && styles.optTextCorrect, showWrong && styles.optTextWrong]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{translateName(opt)}</Text>
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
          hideLabel
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
          <Text
            style={[styles.teaserResultText, picked === question.flag.name ? styles.teaserResultCorrect : styles.teaserResultWrong]}
            accessibilityLiveRegion="polite"
          >
            {picked === question.flag.name ? t('common.correct') : flagName(question.flag)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onNavigate = useNavTabs();
  const totalFlags = getTotalFlagCount();
  const [mode, setMode] = useState<GameMode>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [teaserKey, setTeaserKey] = useState(0);
  const [weakFlagCount, setWeakFlagCount] = useState(0);
  const [dailyDone, setDailyDone] = useState(false);
  const dailyVariant = useMemo(() => getDailyVariant(), []);
  const dailyTagText = useMemo(() => {
    const diffLabel = t(`common.${dailyVariant.difficulty}`).toLowerCase();
    if (dailyVariant.gameType === 'flagpuzzle') {
      return t('home.dailyVariant', { mode: t('setup.flagPuzzle').toLowerCase() });
    }
    if (dailyVariant.gameType === 'capitalconnection') {
      return t('home.dailyVariant', { mode: `${t('setup.capitalQuiz').toLowerCase()} - ${diffLabel}` });
    }
    const modeStr = dailyVariant.displayMode === 'map'
      ? `${diffLabel} ${t('setup.displayMap').toLowerCase()}`
      : diffLabel;
    return t('home.dailyVariant', { mode: modeStr });
  }, [dailyVariant]);
  const [autocomplete, setAutocomplete] = useState(false);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [dayStreak, setDayStreak] = useState(0);
  const playBtnScale = useRef(new Animated.Value(1)).current;

  const pulsePlayBtn = useCallback(() => {
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(playBtnScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.spring(playBtnScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      ]).start();
    }, 600);
  }, [playBtnScale]);

  useEffect(() => {
    initAudio();
    getSettings().then((s) => {
      setSoundsEnabled(s.soundEnabled);
      setHapticsEnabled(s.hapticsEnabled);
    }).catch(() => {});
  }, []);

  // Track known skill level so we only update difficulty on actual promotions
  const lastSkillRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats).catch(() => {});
      getMissedFlagIds().then((ids) => setWeakFlagCount(ids.length)).catch(() => {});
      isDailyCompleteToday().then(setDailyDone).catch(() => {});
      getBaselineData().then(setBaseline).catch(() => {});
      setTeaserKey((k) => k + 1);
      // Sync difficulty when skill level changes (initial load or auto-promotion)
      getSkillLevel().then((skill) => {
        if (skill && skill !== lastSkillRef.current) {
          setMode(getDefaultDifficulty(skill));
          lastSkillRef.current = skill;
        }
      }).catch(() => {});
      Promise.all([getStats(), getFlagStats(), getBadgeData(), getDayStreakInfo(), getPersistedLevel()]).then(
        ([s, fs, bd, dsi, pl]) => {
          setStats(s);
          setDayStreak(dsi.current);
          const lp = computeLevelProgress({ stats: s, flagStats: fs, badgeData: bd, dayStreakInfo: dsi }, pl);
          persistLevel(lp.currentLevel);
        },
      ).catch(() => {});
    }, []),
  );

  const play = () => {
    hapticTap();
    navigation.navigate('Game', {
      config: { mode, category: 'all', questionCount: questionCountAll ? totalFlags : questionCount, displayMode: 'flag', ...(mode === 'hard' && { autocomplete }) },
    });
  };

  const onboardingComplete = baseline ? baseline.completedAt !== null : true;
  const onboardingCount = baseline ? BASELINE_REGIONS.filter((r) => baseline.regions[r]).length : 0;
  const nextRegion = baseline ? BASELINE_REGIONS.find((r) => !baseline.regions[r]) ?? BASELINE_REGIONS[0] : BASELINE_REGIONS[0];

  // ── Game modes (data-driven, uniform cards) ──
  const modes: ModeItem[] = [
    {
      key: 'daily',
      title: t('home.daily'),
      tag: dailyDone ? t('home.comeBackTomorrow') : dailyTagText,
      icon: <CalendarIcon size={18} color={dailyDone ? colors.textTertiary : colors.modeGold} />,
      accent: colors.modeGold,
      titleColor: dailyDone ? colors.textTertiary : colors.goldBright,
      disabled: dailyDone,
      done: dailyDone,
      onPress: () => {
        hapticTap();
        const config = getDailyConfig();
        if (dailyVariant.gameType === 'flagpuzzle') {
          navigation.navigate('FlagPuzzle', { config });
        } else if (dailyVariant.gameType === 'capitalconnection') {
          navigation.navigate('CapitalConnection', { config });
        } else {
          navigation.navigate('Game', { config });
        }
      },
      a11yLabel: dailyDone ? t('home.comeBackTomorrow') : t('home.daily'),
      a11yHint: dailyDone ? undefined : t('a11y.opensMode'),
    },
    {
      key: 'timeattack',
      title: t('home.timedQuiz'),
      tag: t('home.timedQuizTag'),
      icon: <ClockIcon size={18} color={colors.modeRed} />,
      accent: colors.modeRed,
      onPress: () => {
        hapticTap();
        navigation.navigate('Game', {
          config: { mode: 'timeattack', category: 'all', questionCount: UNLIMITED_QUESTIONS, timeLimit: TIMEATTACK_DEFAULT_TIME, displayMode: 'flag' },
        });
      },
      a11yLabel: t('a11y.playMode', { mode: t('home.timedQuiz') }),
      a11yHint: t('a11y.opensMode'),
    },
    {
      key: 'impostor',
      title: t('home.flagImpostor'),
      tag: t('home.flagImpostorDesc'),
      icon: <EyeIcon size={18} color={colors.modeGreen} />,
      accent: colors.modeGreen,
      onPress: () => {
        hapticTap();
        navigation.navigate('FlagImpostor', {
          config: { mode: 'impostor', category: 'all', questionCount: 10, displayMode: 'flag' },
        });
      },
      a11yLabel: t('a11y.playMode', { mode: t('home.flagImpostor') }),
      a11yHint: t('a11y.opensMode'),
    },
    {
      key: 'flagpuzzle',
      title: t('setup.flagPuzzle'),
      tag: t('setup.flagPuzzleDesc'),
      icon: <PuzzleIcon size={18} color={colors.modePurple} />,
      accent: colors.modePurple,
      onPress: () => {
        hapticTap();
        navigation.navigate('FlagPuzzle', {
          config: { mode: 'flagpuzzle', category: 'all', questionCount: 10, timeLimit: 15, displayMode: 'flag' },
        });
      },
      a11yLabel: t('a11y.playMode', { mode: t('setup.flagPuzzle') }),
      a11yHint: t('a11y.opensMode'),
    },
    {
      key: 'geofacts',
      title: t('home.geoFacts'),
      tag: t('home.geoFactsDesc'),
      icon: <GlobeIcon size={18} color={colors.modeBlue} />,
      accent: colors.modeBlue,
      onPress: () => {
        hapticTap();
        navigation.navigate('GeoFacts');
      },
      a11yLabel: t('a11y.playMode', { mode: t('home.geoFacts') }),
      a11yHint: t('a11y.opensMode'),
    },
    ...(weakFlagCount > 0 ? [{
      key: 'practiceWeak',
      title: t('home.practiceWeak'),
      tag: weakFlagCount === 1 ? t('home.flagsToReview', { count: weakFlagCount }) : t('home.flagsToReviewPlural', { count: weakFlagCount }),
      icon: <CrosshairIcon size={18} color={colors.modeRed} />,
      accent: colors.modeRed,
      titleColor: colors.red,
      onPress: () => {
        hapticTap();
        navigation.navigate('Game', {
          config: { mode: 'practice', category: 'all', questionCount: weakFlagCount, displayMode: 'flag' },
        });
      },
      a11yLabel: t('a11y.playMode', { mode: t('home.practiceWeak') }),
      a11yHint: t('a11y.opensPractice'),
    } as ModeItem] : []),
    {
      key: 'join',
      title: t('challenge.joinTitle'),
      tag: t('challenge.codeHint'),
      icon: <LinkIcon size={18} color={colors.modeGold} />,
      accent: colors.modeGold,
      titleColor: colors.goldBright,
      onPress: () => {
        hapticTap();
        navigation.navigate('JoinChallenge');
      },
      a11yLabel: t('challenge.joinTitle'),
      a11yHint: t('challenge.codeHint'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenContainer>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>
            <Text style={styles.wmFlag}>Flag</Text>
            <Text style={styles.wmThat}>That</Text>
          </Text>
          <StreakPill
            days={dayStreak}
            onPress={() => navigation.navigate('Stats')}
            accessibilityHint={t('a11y.opensStats')}
          />
        </View>

        {/* ── CONFIG (above the flag so players notice they can change the mode) ── */}
        <View style={{ marginHorizontal: spacing.md, marginTop: spacing.sm }}>
          <ConfigCard compact>
            <ConfigRow label={t('home.cards')} showDivider={false} compact>
              {HOME_QUESTION_COUNTS.map((c) => (
                <SegBtn
                  key={c}
                  label={String(c)}
                  active={!questionCountAll && questionCount === c}
                  onPress={() => { setQuestionCount(c); setQuestionCountAll(false); }}
                  maxWidth={54}
                  compact
                  accessibilityLabel={t('common.nCards', { n: c })}
                />
              ))}
              <SegBtn
                label={t('common.all')}
                active={questionCountAll}
                onPress={() => setQuestionCountAll(true)}
                maxWidth={54}
                compact
                accessibilityLabel={t('common.allCards')}
              />
            </ConfigRow>
            <ConfigRow label={t('home.difficulty')} compact>
              {MODE_KEYS.map((m) => (
                <SegBtn
                  key={m}
                  label={t(`common.${m}`)}
                  active={mode === m}
                  onPress={() => setMode(m)}
                  maxWidth={54}
                  compact
                  accessibilityLabel={`${t('home.difficulty')}: ${t(`common.${m}`)}`}
                />
              ))}
            </ConfigRow>
            {mode === 'hard' && (
              <ConfigRow label={t('home.hints')} compact>
                <SegBtn
                  label={t('common.off')}
                  active={!autocomplete}
                  onPress={() => setAutocomplete(false)}
                  maxWidth={54}
                  compact
                  accessibilityLabel={`${t('home.hints')}: ${t('common.off')}`}
                />
                <SegBtn
                  label={t('common.on')}
                  active={autocomplete}
                  onPress={() => setAutocomplete(true)}
                  maxWidth={54}
                  compact
                  accessibilityLabel={`${t('home.hints')}: ${t('common.on')}`}
                />
              </ConfigRow>
            )}
          </ConfigCard>
        </View>

        {/* ── FLAG TEASER ── */}
        <FlagTeaser key={teaserKey} onAnswer={pulsePlayBtn} />

        {/* ── PLAY NOW ── */}
        <Animated.View style={[styles.playWrap, { transform: [{ scale: playBtnScale }] }]}>
          <TouchableOpacity style={styles.playBtn} onPress={play} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('home.playNow')}>
            <Text style={styles.playBtnText}>{t('home.playNow')}</Text>
            <PlayIcon size={14} color={colors.playText} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── FACT OF THE DAY ── */}
        <View style={{ marginHorizontal: spacing.md, marginTop: spacing.md }}>
          <FactOfDay />
        </View>

        {/* ── GAME MODES ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLbl}>{t('home.gameModes')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('GameSetup')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.seeAllModes')}>
              <Text style={styles.sectionAll}>{t('common.all')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeList}>
            {modes.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeCard, m.disabled && styles.modeCardDisabled]}
                activeOpacity={m.disabled ? 1 : 0.85}
                disabled={m.disabled}
                onPress={m.onPress}
                accessibilityRole="button"
                accessibilityLabel={m.a11yLabel}
                accessibilityHint={m.a11yHint}
                accessibilityState={{ disabled: !!m.disabled }}
              >
                <View style={[styles.modeIcon, { backgroundColor: m.accent + '22' }]}>
                  {m.icon}
                </View>
                <View style={styles.modeTextWrap}>
                  <Text style={[styles.modeTitle, m.titleColor ? { color: m.titleColor } : null]} numberOfLines={1}>
                    {m.title}
                  </Text>
                  <Text style={styles.modeTag} numberOfLines={1}>{m.tag}</Text>
                </View>
                {m.done
                  ? <CheckIcon size={16} color={colors.success} />
                  : <ChevronRightIcon size={16} color={colors.dim} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── ONBOARDING PROGRESS (at bottom until complete) ── */}
        {!onboardingComplete && (
          <View style={styles.onboardingWrap}>
            <View style={styles.onboardingTop}>
              <View style={styles.onboardingTopLeft}>
                <Text style={styles.onboardingTitle}>{t('onboarding.baselineProgress')}</Text>
                <Text style={styles.onboardingCount}>
                  {t('onboarding.regionsComplete', { count: onboardingCount, total: BASELINE_REGIONS.length })}
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
                accessibilityRole="button"
                accessibilityLabel={t('a11y.startBaseline', { region: t(`categories.${nextRegion}`) })}
                accessibilityHint={t('a11y.beginsBaseline')}
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
                    { width: `${(onboardingCount / BASELINE_REGIONS.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.onboardingMotivation}>{t('onboarding.baselineMotivation')}</Text>
            </View>
            {/* Region chips */}
            <View style={styles.onboardingChips}>
              {BASELINE_REGIONS.map((r) => {
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
                    accessibilityRole="button"
                    accessibilityLabel={isDone ? t('a11y.regionCompleted', { region: t(`categories.${r}`), accuracy: result!.accuracy }) : t('a11y.startBaseline', { region: t(`categories.${r}`) })}
                    accessibilityState={{ disabled: isDone }}
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
const createStyles = (colors: ThemeColors) => { const btn = buildButtons(colors); return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    fontSize: fontSize.title,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  wmThat: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.title,
    color: colors.goldBright,
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
    ...typography.bodyBold,
    color: colors.ink,
    marginBottom: spacing.xxs,
  },
  onboardingCount: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  onboardingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.goldBright,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  onboardingCtaText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xs,
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
    ...typography.micro,
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
    ...typography.microMedium,
    color: colors.textTertiary,
  },
  onboardingChipTextDone: {
    color: colors.success,
  },
  onboardingChipTextPending: {
    color: colors.goldBright,
  },
  onboardingChipPct: {
    ...typography.tag,
    color: colors.success,
  },

  // ── Hero flag teaser (light mode - no dark background)
  heroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  heroLabel: {
    ...typography.eyebrow,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  flagWrap: {
    width: '100%',
    maxWidth: layout.maxFlagWidth,
    alignSelf: 'center',
    aspectRatio: 3 / 2,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },

  // Options 2x2
  optsGrid: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    width: '100%',
    maxWidth: layout.maxFlagWidth,
    alignSelf: 'center',
  },
  optsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  optWrap: {
    flex: 1,
  },
  optBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 42,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...typography.label,
    fontSize: fontSize.sm,
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
    color: colors.error,
    fontSize: fontSize.lg,
  },
  // ── Play button
  playWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  playBtn: {
    ...btn.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + spacing.xs,
  },
  playBtnText: {
    ...btn.primaryText,
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
    ...typography.heading,
    color: colors.ink,
  },
  sectionAll: {
    ...typography.microMedium,
    color: colors.textTertiary,
  },
  modeList: {
    gap: spacing.sm,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
  },
  modeCardDisabled: {
    opacity: 0.6,
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTextWrap: {
    flex: 1,
  },
  modeTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.sm,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  modeTag: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },

}); };
