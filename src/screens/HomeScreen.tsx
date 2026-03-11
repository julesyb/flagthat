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
import { colors, fontFamily, spacing } from '../utils/theme';
import { getTotalFlagCount, getCategoryCount } from '../data';
import { initAudio, hapticTap, hapticCorrect, hapticWrong, playCorrectSound, playWrongSound } from '../utils/feedback';
import { getStats, getDayStreak } from '../utils/storage';
import { generateQuestions } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { GameMode, UserStats, GameQuestion, CategoryId } from '../types';
import { LightningIcon, CrosshairIcon, BarChartIcon, GlobeIcon } from '../components/Icons';
import FlagImage from '../components/FlagImage';

// ─── Local border radii (home screen uses rounded cards) ─────
const R_SM = 8;
const R_MD = 10;
const R_LG = 14;
const R_XL = 18;

const MODES: { key: GameMode; label: string }[] = [
  { key: 'easy', label: '2 Easy' },
  { key: 'medium', label: '4 Hard' },
  { key: 'hard', label: 'Type' },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

const REGIONS: { id: CategoryId; label: string }[] = [
  { id: 'europe', label: 'Europe' },
  { id: 'asia', label: 'Asia' },
  { id: 'africa', label: 'Africa' },
  { id: 'americas', label: 'Americas' },
  { id: 'oceania', label: 'Oceania' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Flag Teaser (inline mini-quiz) ─────────────────────────
function FlagTeaser() {
  const question = useMemo<GameQuestion | null>(() => {
    const qs = generateQuestions({ mode: 'medium', category: 'all', questionCount: 1, displayMode: 'flag' });
    return qs[0] ?? null;
  }, []);

  const [picked, setPicked] = useState<string | null>(null);
  const coverOpacity = useRef(new Animated.Value(1)).current;
  const optAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Reveal flag
    Animated.timing(coverOpacity, {
      toValue: 0,
      duration: 600,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Pop in options after reveal
    const timer = setTimeout(() => {
      Animated.stagger(
        100,
        optAnims.map((a) =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }),
        ),
      ).start();
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  if (!question) return null;

  const handlePick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === question.flag.name) {
      hapticCorrect();
      playCorrectSound();
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
          style={{ borderRadius: R_SM }}
        />
        <Animated.View style={[s.flagCover, { opacity: coverOpacity }]}>
          <Text style={s.coverQ}>?</Text>
        </Animated.View>
      </View>

      {/* Options 2x2 */}
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
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const totalFlags = getTotalFlagCount();
  const [mode, setMode] = useState<GameMode>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dayStreak, setDayStreak] = useState(0);
  const [teaserKey, setTeaserKey] = useState(0);

  useEffect(() => {
    initAudio();
  }, []);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
      getDayStreak().then(setDayStreak);
      setTeaserKey((k) => k + 1);
    }, []),
  );

  const play = () => {
    hapticTap();
    navigation.navigate('Game', {
      config: { mode, category: 'all', questionCount: questionCountAll ? totalFlags : questionCount, displayMode: 'flag' },
    });
  };

  const hasPlayed = stats !== null && stats.totalGamesPlayed > 0;

  // Region accuracy for progress bars
  const regionProgress = REGIONS.map((r) => {
    const cs = stats?.categoryStats[r.id];
    const pct = cs && cs.total > 0 ? Math.round((cs.correct / cs.total) * 100) : 0;
    return { ...r, pct };
  });

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
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

        {/* ── FLAG TEASER ── */}
        <FlagTeaser key={teaserKey} />

        {/* ── PLAY NOW ── */}
        <View style={s.playWrap}>
          <TouchableOpacity style={s.playBtn} onPress={play} activeOpacity={0.85}>
            <View style={s.playBolt}>
              <LightningIcon size={14} color={colors.white} filled />
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
            <Text style={s.configLbl}>Options</Text>
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
        </View>

        {/* ── GAME MODES ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionLbl}>Game modes</Text>

          <TouchableOpacity style={s.modeCard} activeOpacity={0.85} onPress={play}>
            <View style={s.modeIcon}>
              <LightningIcon size={18} color={colors.white} filled />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>Quick Play</Text>
              <Text style={s.modeSub}>{questionCountAll ? `All ${totalFlags}` : questionCount} random flags, all {totalFlags} countries</Text>
            </View>
            <Text style={s.modeChev}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => { hapticTap(); navigation.navigate('GameSetup'); }}
          >
            <View style={[s.modeIcon, s.modeIconRed]}>
              <CrosshairIcon size={18} color={colors.white} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>Game Mode</Text>
              <Text style={s.modeSub}>Choose difficulty and region</Text>
            </View>
            <Text style={s.modeChev}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.modeCard}
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              navigation.navigate('FlagFlash', {
                config: { mode: 'flagflash', category: 'all', questionCount: 999, timeLimit: 60 },
              });
            }}
          >
            <View style={s.modeIcon}>
              <LightningIcon size={18} color={colors.white} filled={false} />
            </View>
            <View style={s.modeText}>
              <Text style={s.modeTitle}>FlagFlash</Text>
              <Text style={s.modeSub}>Speed round — how fast are you?</Text>
            </View>
            <Text style={s.modeChev}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── YOUR PROGRESS ── */}
        {hasPlayed && (
          <View style={s.progressCard}>
            <Text style={[s.sectionLbl, { marginBottom: 12 }]}>Your progress</Text>
            {regionProgress.map((r) => (
              <View key={r.id} style={s.progRow}>
                <Text style={s.progName}>{r.label}</Text>
                <View style={s.progTrack}>
                  <View style={[s.progFill, { width: `${r.pct}%` }]} />
                </View>
                <Text style={s.progPct}>{r.pct}%</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.md }} />
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navTab} onPress={play} activeOpacity={0.6}>
          <LightningIcon size={20} color={colors.ink} filled />
          <Text style={[s.navLbl, s.navLblActive]}>Play</Text>
          <View style={s.navDot} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navTab}
          onPress={() => { hapticTap(); navigation.navigate('GameSetup'); }}
          activeOpacity={0.6}
        >
          <CrosshairIcon size={20} color={colors.textTertiary} />
          <Text style={s.navLbl}>Modes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navTab}
          onPress={() => {
            hapticTap();
            navigation.navigate('FlagFlash', {
              config: { mode: 'flagflash', category: 'all', questionCount: 999, timeLimit: 60 },
            });
          }}
          activeOpacity={0.6}
        >
          <LightningIcon size={20} color={colors.textTertiary} filled={false} />
          <Text style={s.navLbl}>Flash</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navTab}
          onPress={() => { hapticTap(); navigation.navigate('Stats'); }}
          activeOpacity={0.6}
        >
          <BarChartIcon size={20} color={colors.textTertiary} />
          <Text style={s.navLbl}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navTab}
          onPress={() => { hapticTap(); navigation.navigate('Browse'); }}
          activeOpacity={0.6}
        >
          <GlobeIcon size={20} color={colors.textTertiary} />
          <Text style={s.navLbl}>Browse</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 26,
    lineHeight: 26,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  wmLine2: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 26,
    lineHeight: 26,
    color: colors.accent,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  streakVal: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 28,
    lineHeight: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  streakLbl: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 1,
  },
  streakLblMuted: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginTop: 1,
  },

  // ── Hero flag teaser
  heroCard: {
    backgroundColor: colors.ink,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: R_XL,
    padding: 22,
    paddingTop: 24,
  },
  heroLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.whiteAlpha45,
    marginBottom: 18,
  },
  flagWrap: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: R_SM,
    overflow: 'hidden',
    position: 'relative',
  },
  flagCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverQ: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    color: colors.whiteAlpha15,
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
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: R_MD,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  optCorrect: {
    backgroundColor: 'rgba(56,195,100,0.2)',
    borderColor: 'rgba(56,195,100,0.5)',
  },
  optWrong: {
    backgroundColor: 'rgba(207,35,24,0.2)',
    borderColor: 'rgba(207,35,24,0.45)',
  },
  optText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.whiteAlpha70,
    textAlign: 'center',
  },
  optTextCorrect: {
    color: '#7ee8a2',
  },
  optTextWrong: {
    color: '#f8a09a',
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
    borderRadius: R_LG,
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
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.white,
  },

  // ── Config card
  configCard: {
    marginHorizontal: spacing.md,
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: R_LG,
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
    borderRadius: R_SM,
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
    letterSpacing: 2,
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
    borderRadius: R_LG,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 7,
    gap: 12,
  },
  modeIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.ink,
    borderRadius: R_MD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeIconRed: {
    backgroundColor: colors.accent,
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    fontFamily: fontFamily.display,
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
  modeChev: {
    fontFamily: fontFamily.body,
    fontSize: 22,
    color: colors.rule,
  },

  // ── Progress card
  progressCard: {
    marginHorizontal: spacing.md,
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: R_LG,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: 16,
  },
  progRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 9,
  },
  progName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textTertiary,
    width: 60,
    flexShrink: 0,
  },
  progTrack: {
    flex: 1,
    height: 5,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 99,
  },
  progPct: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 13,
    color: colors.ink,
    width: 28,
    textAlign: 'right',
  },

  // ── Bottom nav
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.background,
    paddingTop: 6,
    paddingBottom: 20,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 3,
  },
  navLbl: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  navLblActive: {
    color: colors.ink,
  },
  navDot: {
    width: 4,
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginTop: 2,
  },
});
