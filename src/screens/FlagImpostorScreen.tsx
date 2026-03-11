import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, buttons, borderRadius } from '../utils/theme';
import { hapticTap, hapticCorrect, hapticWrong, playWrongSound } from '../utils/feedback';
import { updateStats, updateFlagResults } from '../utils/storage';
import { shuffleArray, getStreakFromResults } from '../utils/gameEngine';
import { t } from '../utils/i18n';
import { RootStackParamList } from '../types/navigation';
import { FlagItem, GameResult } from '../types';
import { countries } from '../data/countries';
import FlagImage from '../components/FlagImage';
import { CheckIcon, CrossIcon } from '../components/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'FlagImpostor'>;

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffleArray(arr).slice(0, count);
}

// ── Procedural fake flag generation ──

const FLAG_COLORS = [
  '#CE1126', '#009739', '#003DA5', '#FFCD00', '#000000', '#FFFFFF',
  '#FF6600', '#00A9E0', '#7B3F00', '#D21034', '#007A5E', '#EF3340',
  '#003893', '#FCD116', '#C8102E', '#00843D', '#E30A17', '#002664',
];

// Known real-flag color combos to avoid generating (type + sorted colors)
const REAL_FLAG_COMBOS = new Set([
  'triband_h:#000000,#CE1126,#FFFFFF',   // Egypt-like
  'triband_h:#003DA5,#CE1126,#FFFFFF',   // France/Netherlands-like
  'triband_v:#003DA5,#CE1126,#FFFFFF',   // France
  'triband_v:#009739,#CE1126,#FFFFFF',   // Italy
  'triband_h:#000000,#CE1126,#FFCD00',   // Germany
  'triband_h:#003DA5,#FFFFFF,#EF3340',   // Luxembourg/Netherlands
  'triband_v:#009739,#FF6600,#FFFFFF',   // Ireland
  'triband_h:#003DA5,#FFFFFF,#CE1126',   // Russia
  'bicolor:#003DA5,#FFCD00',             // Ukraine
  'triband_v:#003DA5,#FFCD00,#EF3340',   // Romania/Chad
  'triband_h:#009739,#FFCD00,#EF3340',   // Lithuania
  'triband_v:#003DA5,#FFFFFF,#EF3340',   // France
  'triband_h:#000000,#EF3340,#FFCD00',   // Germany/Belgium
]);

interface FakeFlag {
  type: 'triband_h' | 'triband_v' | 'bicolor' | 'cross' | 'chevron';
  colors: string[];
  hasSymbol: boolean;
  symbolType?: 'star' | 'diamond';
  symbolColor?: string;
  reason: string;
}

function generateFakeFlag(): FakeFlag {
  const types: FakeFlag['type'][] = ['triband_h', 'triband_v', 'bicolor', 'cross', 'chevron'];
  // Only geometric shapes — no circles
  const symbolTypes: NonNullable<FakeFlag['symbolType']>[] = ['star', 'diamond'];

  // Try up to 10 times to generate a flag that doesn't match a known real flag
  for (let attempt = 0; attempt < 10; attempt++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const shuffledColors = shuffleArray([...FLAG_COLORS]);
    // Max 3 base colors for the layout (+ 1 symbol color = max 4 total)
    const numBaseColors = type === 'bicolor' ? 2 : 3;
    const flagColors = shuffledColors.slice(0, numBaseColors);

    // Always add a single symbol/crest to make it clearly fake
    const symbolType = symbolTypes[Math.floor(Math.random() * symbolTypes.length)];
    const symbolColor = shuffledColors[numBaseColors] || '#FFFFFF';

    // Check if this combo matches a known real flag (ignoring symbol)
    const sortedColors = [...flagColors].sort().join(',');
    const comboKey = `${type}:${sortedColors}`;
    if (REAL_FLAG_COMBOS.has(comboKey)) continue;

    return {
      type,
      colors: flagColors,
      hasSymbol: true,
      symbolType,
      symbolColor,
      reason: 'Procedurally generated, no real country uses this combination',
    };
  }

  // Fallback: use chevron with symbol (very unlikely to be a real flag)
  const shuffledColors = shuffleArray([...FLAG_COLORS]);
  return {
    type: 'chevron',
    colors: shuffledColors.slice(0, 3),
    hasSymbol: true,
    symbolType: 'star',
    symbolColor: shuffledColors[3] || '#FFFFFF',
    reason: 'Procedurally generated, no real country uses this combination',
  };
}

function FakeFlagSvg({ flag, width, height }: { flag: FakeFlag; width: number; height: number }) {
  const renderSymbol = () => {
    if (!flag.hasSymbol || !flag.symbolType || !flag.symbolColor) return null;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.12;

    switch (flag.symbolType) {
      case 'star': {
        const points: string[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 144 - 90) * (Math.PI / 180);
          points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return <Path d={`M ${points.join(' L ')} Z`} fill={flag.symbolColor} />;
      }
      case 'diamond':
        return (
          <Path
            d={`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`}
            fill={flag.symbolColor}
          />
        );
      default:
        return null;
    }
  };

  switch (flag.type) {
    case 'triband_h':
      return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect x={0} y={0} width={width} height={height / 3} fill={flag.colors[0]} />
          <Rect x={0} y={height / 3} width={width} height={height / 3} fill={flag.colors[1]} />
          <Rect x={0} y={(height / 3) * 2} width={width} height={height / 3} fill={flag.colors[2]} />
          {renderSymbol()}
        </Svg>
      );
    case 'triband_v':
      return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect x={0} y={0} width={width / 3} height={height} fill={flag.colors[0]} />
          <Rect x={width / 3} y={0} width={width / 3} height={height} fill={flag.colors[1]} />
          <Rect x={(width / 3) * 2} y={0} width={width / 3} height={height} fill={flag.colors[2]} />
          {renderSymbol()}
        </Svg>
      );
    case 'bicolor':
      return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect x={0} y={0} width={width} height={height / 2} fill={flag.colors[0]} />
          <Rect x={0} y={height / 2} width={width} height={height / 2} fill={flag.colors[1]} />
          {renderSymbol()}
        </Svg>
      );
    case 'cross': {
      const barW = height * 0.2;
      return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect x={0} y={0} width={width} height={height} fill={flag.colors[0]} />
          <Rect x={0} y={(height - barW) / 2} width={width} height={barW} fill={flag.colors[1]} />
          <Rect x={width * 0.3 - barW / 2} y={0} width={barW} height={height} fill={flag.colors[1]} />
          {renderSymbol()}
        </Svg>
      );
    }
    case 'chevron':
      return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect x={0} y={0} width={width} height={height / 2} fill={flag.colors[0]} />
          <Rect x={0} y={height / 2} width={width} height={height / 2} fill={flag.colors[1]} />
          <Path d={`M 0,0 L ${width * 0.35},${height / 2} L 0,${height} Z`} fill={flag.colors[2]} />
          {renderSymbol()}
        </Svg>
      );
  }
}

interface RoundData {
  realFlags: FlagItem[];
  fakeFlag: FakeFlag;
  fakeIndex: number;
}

function generateRounds(count: number): RoundData[] {
  const rounds: RoundData[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const available = countries.filter((c) => !usedIds.has(c.id));
    const realFlags = pickRandom(available.length >= 3 ? available : countries, 3);
    realFlags.forEach((f) => usedIds.add(f.id));
    rounds.push({ realFlags, fakeFlag: generateFakeFlag(), fakeIndex: Math.floor(Math.random() * 4) });
  }
  return rounds;
}

export default function FlagImpostorScreen({ navigation, route }: Props) {
  const { config } = route.params;
  const rounds = useMemo(() => generateRounds(config.questionCount), [config.questionCount]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const roundStartTime = useRef(Date.now());

  const guessLimit = config.guessLimit ?? 0;
  const wrongCount = results.filter((r) => !r.correct).length;

  const round = rounds[roundIndex] ?? null;
  const isLastRound = roundIndex >= rounds.length - 1;
  const correctCount = results.filter((r) => r.correct).length;

  const grid = useMemo(() => {
    if (!round) return [];
    const items: { isFake: boolean; flag?: FlagItem; fakeFlag?: FakeFlag; index: number }[] = [];
    let realIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === round.fakeIndex) {
        items.push({ isFake: true, fakeFlag: round.fakeFlag, index: i });
      } else {
        items.push({ isFake: false, flag: round.realFlags[realIdx], index: i });
        realIdx++;
      }
    }
    return items;
  }, [round]);

  if (!round) return null;

  const handlePick = (index: number) => {
    if (picked !== null) return;
    setPicked(index);
    hapticTap();

    const isCorrect = index === round.fakeIndex;
    if (isCorrect) { hapticCorrect(); }
    else { hapticWrong(); playWrongSound(); }

    const tappedFlag = grid[index];
    const userLabel = tappedFlag.isFake ? 'Fake flag' : tappedFlag.flag!.name;

    setResults((prev) => [...prev, {
      question: { flag: round.realFlags[0], options: round.realFlags.map((f) => f.name) },
      userAnswer: userLabel,
      correct: isCorrect,
      timeTaken: Date.now() - roundStartTime.current,
    }]);
  };

  const finishGame = (finalResults: GameResult[]) => {
    const correct = finalResults.filter((r) => r.correct).length;
    const streak = getStreakFromResults(finalResults);
    updateStats(correct, finalResults.length, streak, 'impostor', config.category);
    updateFlagResults(finalResults);
    navigation.replace('Results', { results: finalResults, config });
  };

  const handleNext = () => {
    const isEliminated = guessLimit > 0 && results.filter((r) => !r.correct).length >= guessLimit;
    if (isLastRound || isEliminated) {
      finishGame([...results]);
      return;
    }

    fadeAnim.setValue(1);
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setRoundIndex((i) => i + 1);
      setPicked(null);
      roundStartTime.current = Date.now();
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const FLAG_W = 120;
  const FLAG_H = 80;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitButton} accessibilityRole="button">
          <Text style={styles.exitText}>{t('common.exit')}</Text>
        </TouchableOpacity>
        <View style={styles.centerInfo}>
          <Text style={styles.counter}>{t('game.questionOf', { current: roundIndex + 1, total: rounds.length })}</Text>
          <Text style={styles.scoreText}>{t('game.correctCount', { count: correctCount })}</Text>
        </View>
        {guessLimit > 0 ? (
          <Text style={styles.livesText}>{guessLimit - wrongCount === 1 ? t('game.life', { count: Math.max(0, guessLimit - wrongCount) }) : t('game.lives', { count: Math.max(0, guessLimit - wrongCount) })}</Text>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.prompt}>{t('impostor.spotImpostor')}</Text>
          <Text style={styles.subtitle}>{t('impostor.spotImpostorDesc')}</Text>

          <View style={styles.grid}>
            {grid.map((item) => {
              const isRevealed = picked !== null;
              const isThis = picked === item.index;
              const correctPick = item.isFake && isThis;
              const wrongPick = !item.isFake && isThis;
              const showAsFake = isRevealed && item.isFake;

              return (
                <TouchableOpacity
                  key={item.index}
                  style={[
                    styles.gridCard,
                    isRevealed && showAsFake && styles.gridCardFake,
                    correctPick && styles.gridCardCorrect,
                    wrongPick && styles.gridCardWrong,
                  ]}
                  onPress={() => handlePick(item.index)}
                  activeOpacity={0.7}
                  disabled={picked !== null}
                >
                  {item.isFake ? (
                    <View style={styles.flagWrapper}>
                      <FakeFlagSvg flag={item.fakeFlag!} width={FLAG_W} height={FLAG_H} />
                    </View>
                  ) : (
                    <FlagImage countryCode={item.flag!.id} emoji={item.flag!.emoji} size="medium" />
                  )}

                  {isRevealed && (
                    <View style={styles.revealInfo}>
                      {item.isFake ? (
                        <Text style={styles.fakeLabel}>{t('impostor.fake')}</Text>
                      ) : (
                        <>
                          <Text style={styles.realName}>{item.flag!.name}</Text>
                          <Text style={styles.realRegion}>{item.flag!.region}</Text>
                        </>
                      )}
                    </View>
                  )}

                  {isRevealed && item.isFake && (
                    <View style={styles.badge}>
                      <CrossIcon size={16} color={colors.white} />
                    </View>
                  )}
                  {correctPick && (
                    <View style={[styles.badge, styles.badgeCorrect]}>
                      <CheckIcon size={16} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {picked !== null && (
            <View style={styles.reasonCard}>
              <Text style={styles.reasonTitle}>{picked === round.fakeIndex ? t('common.correct') : t('common.wrong')}</Text>
              <Text style={styles.reasonText}>{t('impostor.fakeExplanation')}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {picked !== null && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.actionButtonText}>{isLastRound ? t('common.seeResults') : t('common.next')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: { padding: spacing.sm, width: 60 },
  exitText: {
    fontSize: 13,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.5,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  centerInfo: { alignItems: 'center' },
  counter: { ...typography.bodyBold, color: colors.text },
  scoreText: { ...typography.caption, color: colors.success },
  spacer: { width: 60 },
  livesText: { ...typography.bodyBold, color: colors.error, width: 60, textAlign: 'right' },
  content: { padding: spacing.lg, paddingBottom: 120 },
  prompt: { ...typography.headingUpper, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  gridCard: {
    width: '46%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  gridCardFake: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  gridCardCorrect: { borderColor: colors.success, backgroundColor: colors.successBg },
  gridCardWrong: { borderColor: colors.error, backgroundColor: colors.errorBg },
  flagWrapper: {
    width: 120,
    height: 80,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  revealInfo: { alignItems: 'center', gap: spacing.xxs },
  fakeLabel: { fontFamily: fontFamily.uiLabel, fontSize: 14, letterSpacing: 2, color: colors.accent, textTransform: 'uppercase' },
  realName: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  realRegion: { fontFamily: fontFamily.body, fontSize: 11, color: colors.textTertiary },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCorrect: { backgroundColor: colors.success },
  reasonCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  reasonTitle: { fontFamily: fontFamily.uiLabel, fontSize: 16, letterSpacing: 1, color: colors.ink, textTransform: 'uppercase' },
  reasonText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  actionButton: { ...buttons.primary },
  actionButtonText: { ...buttons.primaryText },
});
