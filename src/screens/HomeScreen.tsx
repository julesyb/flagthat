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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamily, fontSize, spacing, borderRadius, shadows } from '../utils/theme';
import { getTotalFlagCount, getCategoryCount } from '../data';
import { initAudio, hapticTap, hapticCorrect, hapticWrong, playWrongSound, setSoundsEnabled, setHapticsEnabled } from '../utils/feedback';
import { getStats, getDayStreak, getSettings, getMissedFlagIds, getBaselineData, BaselineData } from '../utils/storage';
import { generateQuestions } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { GameMode, UserStats, GameQuestion, CategoryId } from '../types';
import { PlayIcon, ChevronRightIcon, ChevronDownIcon, ClockIcon, UsersIcon, EyeIcon, CrosshairIcon, LightningIcon, GearIcon, PuzzleIcon, CheckIcon } from '../components/Icons';
import FlagImage from '../components/FlagImage';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import SupportCard from '../components/SupportCard';
import { preloadRewardedAd } from '../utils/ads';
import { t } from '../utils/i18n';
import { translateName, flagName } from '../data/countryNames';

const MODE_KEYS: GameMode[] = ['easy', 'medium', 'hard'];

const QUESTION_COUNTS = [5, 10, 15, 20];




type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Flag Teaser (inline mini-quiz) ─────────────────────────
function FlagTeaser() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  };

  return (
    <View style={s.heroCard}>
      <Text style={s.heroLabel}>{t('home.nameThisFlag')}</Text>
      <View style={s.flagWrap}>
        <FlagImage
          countryCode={question.flag.id}
          emoji={question.flag.emoji}
          size="hero"
          style={{ width: '100%' }}
        />
      </View>

      {/* Options 2x2 */}
      {!picked ? (
        <View style={s.optsGrid}>
          <View style={s.optsRow}>
            {question.options.slice(0, 2).map((opt, i) => {
              const isCorrect = opt === question.flag.name;
              const isSelected = picked === opt;
              const showCorrect = picked !== null && isCorrect;
              const showWrong = isSelected && !isCorrect;
              return (
                <Animated.View
                  key={opt}
                  style={[
                    s.optWrap,
                    { opacity: optAnims[i], transform: [{ scale: optAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
                  ]}
                >
                  <TouchableOpacity
                    style={[s.optBtn, showCorrect && s.optCorrect, showWrong && s.optWrong]}
                    onPress={() => handlePick(opt)}
                    activeOpacity={0.8}
                    disabled={picked !== null}
                  >
                    <Text style={[s.optText, showCorrect && s.optTextCorrect, showWrong && s.optTextWrong]}>{translateName(opt)}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
          <View style={s.optsRow}>
            {question.options.slice(2, 4).map((opt, i) => {
              const idx = i + 2;
              const isCorrect = opt === question.flag.name;
              const isSelected = picked === opt;
              const showCorrect = picked !== null && isCorrect;
              const showWrong = isSelected && !isCorrect;
              return (
                <Animated.View
                  key={opt}
                  style={[
                    s.optWrap,
                    { opacity: optAnims[idx], transform: [{ scale: optAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
                  ]}
                >
                  <TouchableOpacity
                    style={[s.optBtn, showCorrect && s.optCorrect, showWrong && s.optWrong]}
                    onPress={() => handlePick(opt)}
                    activeOpacity={0.8}
                    disabled={picked !== null}
                  >
                    <Text style={[s.optText, showCorrect && s.optTextCorrect, showWrong && s.optTextWrong]}>{translateName(opt)}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={s.teaserResult}>
          <Text style={[s.teaserResultText, picked === question.flag.name ? s.teaserResultCorrect : s.teaserResultWrong]}>
            {picked === question.flag.name ? t('common.correct') : flagName(question.flag)}
          </Text>
          <TouchableOpacity
            style={[s.teaserPlayBtn, picked === question.flag.name ? s.teaserPlayBtnCorrect : s.teaserPlayBtnWrong]}
            onPress={() => {
              hapticTap();
              navigation.navigate('Game', {
                config: { mode: 'medium', category: 'all', questionCount: 10, displayMode: 'flag' },
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={s.teaserPlayText}>{t('home.keepPlaying')}</Text>
            <ChevronRightIcon size={14} color={colors.white} />
          </TouchableOpacity>
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
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenContainer>
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.wordmark}>
            <Text style={s.wmLine1}>Flag</Text>
            <Text style={s.wmLine2}>That</Text>
          </View>
          <View style={s.headerRight}>
            {dayStreak > 0 ? (
              <>
                <Text style={s.streakVal}>{dayStreak}</Text>
                <Text style={s.streakLbl}>{t('home.dayStreak')}</Text>
              </>
            ) : (
              <>
                <Text style={s.streakVal}>{totalFlags}</Text>
                <Text style={s.streakLblMuted}>{t('home.countries')}</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={s.settingsBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.6}
          >
            <GearIcon size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ── ONBOARDING PROGRESS ── */}
        {!onboardingComplete && (
          <View style={s.onboardingWrap}>
            <View style={s.onboardingTop}>
              <View style={s.onboardingTopLeft}>
                <Text style={s.onboardingTitle}>{t('onboarding.baselineProgress')}</Text>
                <Text style={s.onboardingCount}>
                  {t('onboarding.regionsComplete', { count: onboardingCount, total: ONBOARDING_REGIONS.length })}
                </Text>
              </View>
              <TouchableOpacity
                style={s.onboardingCta}
                activeOpacity={0.85}
                onPress={() => {
                  hapticTap();
                  const count = getCategoryCount(nextRegion as CategoryId);
                  navigation.navigate('Game', {
                    config: { mode: 'baseline', category: nextRegion as CategoryId, questionCount: count, displayMode: 'flag' },
                  });
                }}
              >
                <Text style={s.onboardingCtaText}>{t(`categories.${nextRegion}`)}</Text>
                <ChevronRightIcon size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
            <View style={s.onboardingBarRow}>
              <View style={s.onboardingBar}>
                <Animated.View
                  style={[
                    s.onboardingBarFill,
                    { width: `${(onboardingCount / ONBOARDING_REGIONS.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={s.onboardingMotivation}>{t('onboarding.baselineMotivation')}</Text>
            </View>
            {/* Region chips */}
            <View style={s.onboardingChips}>
              {ONBOARDING_REGIONS.map((r) => {
                const result = baseline?.regions[r];
                const isDone = !!result;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      s.onboardingChip,
                      isDone ? s.onboardingChipDone : s.onboardingChipPending,
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
                      s.onboardingChipText,
                      isDone ? s.onboardingChipTextDone : s.onboardingChipTextPending,
                    ]}>
                      {t(`categories.${r}`)}
                    </Text>
                    {isDone && <Text style={s.onboardingChipPct}>{result!.accuracy}%</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── FLAG TEASER ── */}
        <FlagTeaser key={teaserKey} />

        {/* ── PLAY NOW ── */}
        <View style={s.playWrap}>
          <TouchableOpacity style={s.playBtn} onPress={play} activeOpacity={0.85}>
            <View style={s.playBolt}>
              <PlayIcon size={14} color={colors.white} />
            </View>
            <Text style={s.playBtnText}>{t('home.playNow')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── CONFIG ── */}
        <View style={s.configCard}>
          <View style={s.configRow}>
            <Text style={s.configLbl}>{t('home.cards')}</Text>
            <View style={s.segRow}>
              {QUESTION_COUNTS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.segBtn, !questionCountAll && questionCount === c && s.segBtnOn]}
                  onPress={() => { hapticTap(); setQuestionCount(c); setQuestionCountAll(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segBtnText, !questionCountAll && questionCount === c && s.segBtnTextOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.segBtn, questionCountAll && s.segBtnOn]}
                onPress={() => { hapticTap(); setQuestionCountAll(true); }}
                activeOpacity={0.7}
              >
                <Text style={[s.segBtnText, questionCountAll && s.segBtnTextOn]}>{t('common.all')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.configDivider} />
          <View style={s.configRow}>
            <Text style={s.configLbl}>{t('home.difficulty')}</Text>
            <View style={s.segRow}>
              {MODE_KEYS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.segBtn, mode === m && s.segBtnOn]}
                  onPress={() => { hapticTap(); setMode(m); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segBtnText, mode === m && s.segBtnTextOn]}>{t(`common.${m}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {mode === 'hard' && (
            <>
              <View style={s.configDivider} />
              <View style={s.configRow}>
                <Text style={s.configLbl}>{t('home.hints')}</Text>
                <View style={s.segRow}>
                  <TouchableOpacity
                    style={[s.segBtn, !autocomplete && s.segBtnOn]}
                    onPress={() => { hapticTap(); setAutocomplete(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.segBtnText, !autocomplete && s.segBtnTextOn]}>{t('common.off')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.segBtn, autocomplete && s.segBtnOn]}
                    onPress={() => { hapticTap(); setAutocomplete(true); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.segBtnText, autocomplete && s.segBtnTextOn]}>{t('common.on')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── GAME MODES ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLbl}>{t('home.gameModes')}</Text>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('Game', {
                config: { mode: 'timeattack', category: 'all', questionCount: 999, timeLimit: 60, displayMode: 'flag' },
              });
            }}
          >
            <View style={[s.modeIcon, { backgroundColor: colors.teal }]}>
              <ClockIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>{t('home.timedQuiz')}</Text>
              <Text style={s.modeSub}>{t('home.timedQuizDesc')}</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('FlagFlash', {
                config: { mode: 'flagflash', category: 'all', questionCount: 999, timeLimit: 60, displayMode: 'flag' },
              });
            }}
          >
            <View style={[s.modeIcon, { backgroundColor: colors.amber }]}>
              <LightningIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>FlagFlash</Text>
              <Text style={s.modeSub}>Party mode - tilt your phone to play</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('Neighbors', {
                config: { mode: 'neighbors', category: 'all', questionCount: 10, displayMode: 'flag' },
              });
            }}
          >
            <View style={[s.modeIcon, { backgroundColor: colors.blue }]}>
              <UsersIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>{t('home.neighbors')}</Text>
              <Text style={s.modeSub}>{t('home.neighborsDesc')}</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('FlagImpostor', {
                config: { mode: 'impostor', category: 'all', questionCount: 10, displayMode: 'flag' },
              });
            }}
          >
            <View style={s.modeIcon}>
              <EyeIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>{t('home.flagImpostor')}</Text>
              <Text style={s.modeSub}>{t('home.flagImpostorDesc')}</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('FlagPuzzle', {
                config: { mode: 'flagpuzzle', category: 'all', questionCount: 10, timeLimit: 15, displayMode: 'flag' },
              });
            }}
          >
            <View style={[s.modeIcon, { backgroundColor: colors.amber }]}>
              <PuzzleIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>{t('setup.flagPuzzle')}</Text>
              <Text style={s.modeSub}>{t('setup.flagPuzzleDesc')}</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('JoinChallenge');
            }}
          >
            <View style={[s.modeIcon, { backgroundColor: colors.teal }]}>
              <UsersIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>{t('challenge.joinTitle')}</Text>
              <Text style={s.modeSub}>{t('challenge.homeDesc')}</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          {weakFlagCount > 0 && (
            <TouchableOpacity
              style={[s.modeCard, { borderColor: colors.accent, borderWidth: 1.5 }]}
              activeOpacity={0.85}
              onPress={() => {
                hapticTap();
                navigation.navigate('Game', {
                  config: { mode: 'practice', category: 'all', questionCount: weakFlagCount, displayMode: 'flag' },
                });
              }}
            >
              <View style={[s.modeIcon, { backgroundColor: colors.accent }]}>
                <CrosshairIcon size={18} color={colors.white} />
              </View>
              <View style={s.modeText}>
                <Text style={s.modeTitle}>{t('home.practiceWeak')}</Text>
                <Text style={s.modeSub}>{weakFlagCount === 1 ? t('home.flagsToReview', { count: weakFlagCount }) : t('home.flagsToReviewPlural', { count: weakFlagCount })}</Text>
              </View>
              <ChevronRightIcon size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── SUPPORT ── */}
        <SupportCard gamesPlayed={stats?.totalGamesPlayed ?? 0} />


        <View style={{ height: spacing.md }} />
        </ScreenContainer>
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <BottomNav activeTab="Home" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  wordmark: {},
  wmLine1: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.wordmark,
    lineHeight: 36,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  wmLine2: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.wordmark,
    lineHeight: 36,
    color: colors.accent,
  },
  headerRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  settingsBtn: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  streakVal: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.title,
    lineHeight: 30,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  streakLbl: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: spacing.xxs,
  },
  streakLblMuted: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },

  // ── Onboarding progress
  onboardingWrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
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
    backgroundColor: colors.ink,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  onboardingCtaText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.white,
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
    backgroundColor: colors.ink,
    borderColor: colors.ink,
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
    color: colors.white,
  },
  onboardingChipPct: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.success,
  },

  // ── Hero flag teaser
  heroCard: {
    backgroundColor: colors.ink,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingTop: spacing.lg,
    ...shadows.large,
  },
  heroLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.whiteAlpha45,
    marginBottom: spacing.md,
  },
  flagWrap: {
    width: '100%',
    aspectRatio: 3 / 2,
    overflow: 'hidden',
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
    backgroundColor: colors.darkSurface,
    borderWidth: 1.5,
    borderColor: colors.darkBorder,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  optCorrect: {
    backgroundColor: colors.successOnDark,
    borderColor: colors.successBorderOnDark,
  },
  optWrong: {
    backgroundColor: colors.errorOnDark,
    borderColor: colors.errorBorderOnDark,
  },
  optText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.whiteAlpha70,
    textAlign: 'center',
  },
  optTextCorrect: {
    color: colors.successTextOnDark,
  },
  optTextWrong: {
    color: colors.errorTextOnDark,
  },

  // ── Teaser result
  teaserResult: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  teaserResultText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.lg,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.white,
  },
  teaserResultCorrect: {
    color: colors.successTextOnDark,
  },
  teaserResultWrong: {
    color: colors.white,
    fontSize: fontSize.xl,
  },
  teaserPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: '100%',
  },
  teaserPlayBtnCorrect: {
    backgroundColor: colors.success,
  },
  teaserPlayBtnWrong: {
    backgroundColor: colors.error,
  },
  teaserPlayText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.lg,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white,
  },

  // ── Play button
  playWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + spacing.xs,
    ...shadows.accentShadow,
  },
  playBolt: {
    width: 24,
    height: 24,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xl,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white,
  },

  // ── Config card
  configCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.rule,
    overflow: 'hidden',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  configDivider: {
    height: 1,
    backgroundColor: colors.rule,
  },
  configLbl: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    color: colors.ink,
    minWidth: 58,
    flexShrink: 0,
  },
  segRow: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  segBtn: {
    flex: 1,
    maxWidth: 54,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.rule,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  segBtnOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  segBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.caption,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  segBtnTextOn: {
    color: colors.white,
  },

  // ── Game modes
  sectionWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionLbl: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.rule,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  modeIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.ink,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginBottom: 2,
  },
  modeSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    lineHeight: 18,
  },

});
