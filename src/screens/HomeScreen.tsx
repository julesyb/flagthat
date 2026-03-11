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
import { colors, fontFamily, spacing, borderRadius } from '../utils/theme';
import { getTotalFlagCount } from '../data';
import { initAudio, hapticTap, hapticCorrect, hapticWrong, playWrongSound, setSoundsEnabled, setHapticsEnabled } from '../utils/feedback';
import { getStats, getDayStreak, getDailyChallenge, DailyChallengeData, getSettings, getMissedFlagIds } from '../utils/storage';
import { generateQuestions, getDailyNumber } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { GameMode, UserStats, GameQuestion } from '../types';
import { PlayIcon, ChevronRightIcon, ClockIcon, UsersIcon, EyeIcon, MapPinIcon, LinkIcon, CalendarIcon, CrosshairIcon, LightningIcon } from '../components/Icons';
import FlagImage from '../components/FlagImage';
import BottomNav from '../components/BottomNav';

const MODES: { key: GameMode; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

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
      <Text style={s.heroLabel}>Name this flag</Text>
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
                    <Text style={[s.optText, showCorrect && s.optTextCorrect, showWrong && s.optTextWrong]}>{opt}</Text>
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
                    <Text style={[s.optText, showCorrect && s.optTextCorrect, showWrong && s.optTextWrong]}>{opt}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={s.teaserResult}>
          <Text style={[s.teaserResultText, picked === question.flag.name ? s.teaserResultCorrect : s.teaserResultWrong]}>
            {picked === question.flag.name ? 'Correct!' : question.flag.name}
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
            <Text style={s.teaserPlayText}>Keep Playing</Text>
            <ChevronRightIcon size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const totalFlags = getTotalFlagCount();
  const [mode, setMode] = useState<GameMode>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dayStreak, setDayStreak] = useState(0);
  const [teaserKey, setTeaserKey] = useState(0);
  const [dailyDone, setDailyDone] = useState<DailyChallengeData | null>(null);
  const [weakFlagCount, setWeakFlagCount] = useState(0);
  const [autocomplete, setAutocomplete] = useState(false);

  useEffect(() => {
    initAudio();
    getSettings().then((s) => {
      setSoundsEnabled(s.soundEnabled);
      setHapticsEnabled(s.hapticsEnabled);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
      getDayStreak().then(setDayStreak);
      getDailyChallenge().then(setDailyDone);
      getMissedFlagIds().then((ids) => setWeakFlagCount(ids.length));
      setTeaserKey((k) => k + 1);
    }, []),
  );

  const play = () => {
    hapticTap();
    navigation.navigate('Game', {
      config: { mode, category: 'all', questionCount: questionCountAll ? totalFlags : questionCount, displayMode: 'flag', ...(mode === 'hard' && { autocomplete }) },
    });
  };

  const hasPlayed = stats !== null && stats.totalGamesPlayed > 0;
  const accuracy = stats && stats.totalAnswered > 0
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : 0;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.desktopWrapper}>
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
                <Text style={s.streakLbl}>day streak</Text>
              </>
            ) : (
              <>
                <Text style={s.streakVal}>{totalFlags}</Text>
                <Text style={s.streakLblMuted}>countries</Text>
              </>
            )}
          </View>
        </View>

        {/* ── DAILY CHALLENGE ── */}
        <TouchableOpacity
          style={[s.dailyCard, dailyDone?.completed && s.dailyCardDone]}
          activeOpacity={0.85}
          onPress={() => {
            hapticTap();
            if (!dailyDone?.completed) {
              navigation.navigate('Game', {
                config: { mode: 'daily', category: 'all', questionCount: 10, displayMode: 'flag' },
              });
            }
          }}
          disabled={dailyDone?.completed}
        >
          <View style={s.dailyLeft}>
            <CalendarIcon size={18} color={dailyDone?.completed ? colors.textTertiary : colors.accent} />
          </View>
          <View style={s.dailyContent}>
            <Text style={[s.dailyTitle, dailyDone?.completed && s.dailyTitleDone]}>
              Daily #{getDailyNumber()}
            </Text>
            <Text style={s.dailySub}>
              {dailyDone?.completed
                ? `${dailyDone.score}/10 - Come back tomorrow`
                : '10 flags, same for everyone'}
            </Text>
          </View>
          {dailyDone?.completed ? (
            <Text style={s.dailyScore}>{dailyDone.score}/10</Text>
          ) : (
            <ChevronRightIcon size={18} color={colors.accent} />
          )}
        </TouchableOpacity>

        {/* ── FLAG TEASER ── */}
        <FlagTeaser key={teaserKey} />

        {/* ── PLAY NOW ── */}
        <View style={s.playWrap}>
          <TouchableOpacity style={s.playBtn} onPress={play} activeOpacity={0.85}>
            <View style={s.playBolt}>
              <PlayIcon size={14} color={colors.white} />
            </View>
            <Text style={s.playBtnText}>Play Now</Text>
          </TouchableOpacity>
        </View>

        {/* ── CONFIG ── */}
        <View style={s.configCard}>
          <View style={s.configRow}>
            <Text style={s.configLbl}>Cards</Text>
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
                <Text style={[s.segBtnText, questionCountAll && s.segBtnTextOn]}>All</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.configDivider} />
          <View style={s.configRow}>
            <Text style={s.configLbl}>Difficulty</Text>
            <View style={s.segRow}>
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.segBtn, mode === m.key && s.segBtnOn]}
                  onPress={() => { hapticTap(); setMode(m.key); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.segBtnText, mode === m.key && s.segBtnTextOn]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {mode === 'hard' && (
            <>
              <View style={s.configDivider} />
              <View style={s.configRow}>
                <Text style={s.configLbl}>Hints</Text>
                <View style={s.segRow}>
                  <TouchableOpacity
                    style={[s.segBtn, !autocomplete && s.segBtnOn]}
                    onPress={() => { hapticTap(); setAutocomplete(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.segBtnText, !autocomplete && s.segBtnTextOn]}>Off</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.segBtn, autocomplete && s.segBtnOn]}
                    onPress={() => { hapticTap(); setAutocomplete(true); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.segBtnText, autocomplete && s.segBtnTextOn]}>On</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── GAME MODES ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLbl}>Game modes</Text>

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
            <View style={s.modeIcon}>
              <ClockIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>Timed Quiz</Text>
              <Text style={s.modeSub}>60 seconds - how many can you get?</Text>
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
            <View style={s.modeIcon}>
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
            <View style={s.modeIcon}>
              <UsersIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>Neighbors</Text>
              <Text style={s.modeSub}>Find all bordering countries</Text>
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
              <Text style={s.modeTitle}>Flag Impostor</Text>
              <Text style={s.modeSub}>Spot the fake flag</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('Game', {
                config: { mode: 'medium', category: 'all', questionCount: 10, displayMode: 'map' },
              });
            }}
          >
            <View style={s.modeIcon}>
              <MapPinIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>Map Mode</Text>
              <Text style={s.modeSub}>Identify countries on the map</Text>
            </View>
            <ChevronRightIcon size={18} color={colors.rule} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('CapitalConnection', {
                config: { mode: 'capitalconnection', category: 'all', questionCount: 10, displayMode: 'flag' },
              });
            }}
          >
            <View style={s.modeIcon}>
              <LinkIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>Capital Quiz</Text>
              <Text style={s.modeSub}>Name the capital city</Text>
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
                <Text style={s.modeTitle}>Practice Weak Flags</Text>
                <Text style={s.modeSub}>{weakFlagCount} flag{weakFlagCount !== 1 ? 's' : ''} to review</Text>
              </View>
              <ChevronRightIcon size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── YOUR STATS ── */}
        {hasPlayed && (
          <View style={s.statsWrap}>
            <Text style={s.sectionLbl}>Your stats</Text>
            <View style={s.statsRow}>
              <View style={s.statTile}>
                <Text style={s.statVal}>{stats!.bestStreak}</Text>
                <Text style={s.statLbl}>Best Streak</Text>
              </View>
              <View style={s.statTile}>
                <Text style={s.statVal}>{stats!.bestTimeAttackScore}</Text>
                <Text style={s.statLbl}>Best 60s</Text>
              </View>
              <View style={s.statTile}>
                <Text style={s.statVal}>{accuracy}%</Text>
                <Text style={s.statLbl}>Accuracy</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: spacing.md }} />
        </View>
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <BottomNav
        activeTab="Play"
        onNavigate={(tab) => {
          hapticTap();
          if (tab === 'Modes') navigation.navigate('GameSetup');
          else if (tab === 'Stats') navigation.navigate('Stats');
          else if (tab === 'Browse') navigation.navigate('Browse');
        }}
      />
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
    alignItems: 'center',
  },
  desktopWrapper: {
    width: '100%',
    maxWidth: 480,
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
    fontSize: 36,
    lineHeight: 38,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  wmLine2: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 36,
    lineHeight: 38,
    color: colors.accent,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  streakVal: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  streakLbl: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 1,
  },
  streakLblMuted: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: 1,
  },

  // ── Daily Challenge
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: 14,
    paddingHorizontal: 16,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: 12,
  },
  dailyCardDone: {
    borderColor: colors.rule,
    opacity: 0.7,
  },
  dailyLeft: {
    width: 40,
    height: 40,
    backgroundColor: colors.accentBg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyContent: {
    flex: 1,
  },
  dailyTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  dailyTitleDone: {
    color: colors.textTertiary,
  },
  dailySub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  dailyScore: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.textTertiary,
  },

  // ── Hero flag teaser
  heroCard: {
    backgroundColor: colors.ink,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: 22,
    paddingTop: 24,
  },
  heroLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.whiteAlpha45,
    marginBottom: 18,
  },
  flagWrap: {
    width: '100%',
    aspectRatio: 3 / 2,
    overflow: 'hidden',
    position: 'relative',
  },

  // Options 2x2
  optsGrid: {
    marginTop: 16,
    gap: 7,
  },
  optsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  optWrap: {
    flex: 1,
  },
  optBtn: {
    backgroundColor: colors.darkSurface,
    borderWidth: 1.5,
    borderColor: colors.darkBorder,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: 10,
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
    fontSize: 14,
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
    marginTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  teaserResultText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.white,
  },
  teaserResultCorrect: {
    color: colors.successTextOnDark,
  },
  teaserResultWrong: {
    color: colors.white,
    fontSize: 18,
  },
  teaserPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
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
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white,
  },

  // ── Play button
  playWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    borderRadius: borderRadius.lg,
    paddingVertical: 18,
  },
  playBolt: {
    width: 24,
    height: 24,
    backgroundColor: colors.accent,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 17,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white,
  },

  // ── Config card
  configCard: {
    marginHorizontal: spacing.md,
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.rule,
    overflow: 'hidden',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
  },
  configDivider: {
    height: 1,
    backgroundColor: colors.rule,
  },
  configLbl: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.ink,
    minWidth: 58,
    flexShrink: 0,
  },
  segRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
    justifyContent: 'flex-end',
  },
  segBtn: {
    flex: 1,
    maxWidth: 54,
    paddingVertical: 7,
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
    fontSize: 13,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  segBtnTextOn: {
    color: colors.white,
  },

  // ── Game modes
  sectionWrap: {
    paddingHorizontal: spacing.md,
    marginTop: 10,
  },
  sectionLbl: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: 8,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: borderRadius.lg,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 7,
    gap: 12,
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
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  modeSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 16,
  },

  // ── Stats row
  statsWrap: {
    paddingHorizontal: spacing.md,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: 14,
    alignItems: 'center',
  },
  statVal: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 26,
  },
  statLbl: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: 4,
  },
});
