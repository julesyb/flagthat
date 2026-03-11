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
import Svg, { Rect, Circle, Path, G } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, buttons, borderRadius } from '../utils/theme';
import { hapticTap, hapticCorrect, hapticWrong, playCorrectSound, playWrongSound } from '../utils/feedback';
import { updateStats } from '../utils/storage';
import { shuffleArray, getStreakFromResults } from '../utils/gameEngine';
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

interface FakeFlag {
  type: 'triband_h' | 'triband_v' | 'bicolor' | 'cross' | 'chevron';
  colors: string[];
  hasSymbol: boolean;
  symbolType?: 'circle' | 'star' | 'crescent';
  symbolColor?: string;
  reason: string;
}

function generateFakeFlag(): FakeFlag {
  const types: FakeFlag['type'][] = ['triband_h', 'triband_v', 'bicolor', 'cross', 'chevron'];
  const type = types[Math.floor(Math.random() * types.length)];
  const shuffledColors = shuffleArray([...FLAG_COLORS]);
  const flagColors = shuffledColors.slice(0, 3);
  const hasSymbol = Math.random() > 0.4;
  const symbolTypes: FakeFlag['symbolType'][] = ['circle', 'star', 'crescent'];

  return {
    type,
    colors: flagColors,
    hasSymbol,
    symbolType: hasSymbol ? symbolTypes[Math.floor(Math.random() * symbolTypes.length)] : undefined,
    symbolColor: hasSymbol ? shuffledColors[3] || '#FFFFFF' : undefined,
    reason: 'Procedurally generated — no real country uses this combination',
  };
}

function FakeFlagSvg({ flag, width, height }: { flag: FakeFlag; width: number; height: number }) {
  const renderSymbol = () => {
    if (!flag.hasSymbol || !flag.symbolType || !flag.symbolColor) return null;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.12;

    switch (flag.symbolType) {
      case 'circle':
        return <Circle cx={cx} cy={cy} r={r} fill={flag.symbolColor} />;
      case 'star': {
        const points: string[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 144 - 90) * (Math.PI / 180);
          points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return <Path d={`M ${points.join(' L ')} Z`} fill={flag.symbolColor} />;
      }
      case 'crescent': {
        return (
          <G>
            <Circle cx={cx} cy={cy} r={r} fill={flag.symbolColor} />
            <Circle cx={cx + r * 0.35} cy={cy} r={r * 0.8} fill={flag.colors[flag.type === 'triband_h' ? 1 : 0]} />
          </G>
        );
      }
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
  fakeIndex: number; // position in grid (0-3)
}

function generateRounds(count: number): RoundData[] {
  const rounds: RoundData[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const available = countries.filter((c) => !usedIds.has(c.id));
    const realFlags = pickRandom(available.length >= 3 ? available : countries, 3);
    realFlags.forEach((f) => usedIds.add(f.id));

    const fakeFlag = generateFakeFlag();
    const fakeIndex = Math.floor(Math.random() * 4);

    rounds.push({ realFlags, fakeFlag, fakeIndex });
  }
  return rounds;
}

export default function FlagImpostorScreen({ navigation, route }: Props) {
  const { config } = route.params;
  const rounds = useMemo(() => generateRounds(config.questionCount), []);
  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const round = rounds[roundIndex];
  const isLastRound = roundIndex >= rounds.length - 1;

  // Build grid: insert fake at fakeIndex
  const grid = useMemo(() => {
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

  const handlePick = (index: number) => {
    if (picked !== null) return;
    setPicked(index);
    hapticTap();

    const isCorrect = index === round.fakeIndex;
    if (isCorrect) {
      hapticCorrect();
      playCorrectSound();
    } else {
      hapticWrong();
      playWrongSound();
    }

    const result: GameResult = {
      question: { flag: round.realFlags[0], options: [] },
      userAnswer: isCorrect ? 'IMPOSTOR' : 'WRONG',
      correct: isCorrect,
      timeTaken: 0,
    };
    setResults((prev) => [...prev, result]);
  };

  const handleNext = () => {
    if (isLastRound) {
      const finalResults = [...results];
      const correct = finalResults.filter((r) => r.correct).length;
      const streak = getStreakFromResults(finalResults);
      updateStats(correct, finalResults.length, streak, 'impostor', config.category);
      navigation.replace('Results', { results: finalResults, config });
      return;
    }

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setRoundIndex((i) => i + 1);
      setPicked(null);
    }, 150);
  };

  if (!round) return null;

  const FLAG_W = 140;
  const FLAG_H = 93;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.exitButton}
          accessibilityRole="button"
        >
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.centerInfo}>
          <Text style={styles.counter}>
            {roundIndex + 1} / {rounds.length}
          </Text>
          <Text style={styles.score}>
            {results.filter((r) => r.correct).length} correct
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.prompt}>Spot the impostor</Text>
          <Text style={styles.subtitle}>One of these flags is fake. Tap it.</Text>

          {/* 2x2 Grid */}
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
                    <FlagImage
                      countryCode={item.flag!.id}
                      emoji={item.flag!.emoji}
                      size="medium"
                    />
                  )}

                  {isRevealed && (
                    <View style={styles.revealInfo}>
                      {item.isFake ? (
                        <Text style={styles.fakeLabel}>FAKE</Text>
                      ) : (
                        <>
                          <Text style={styles.realName}>{item.flag!.name}</Text>
                          <Text style={styles.realRegion}>{item.flag!.region}</Text>
                        </>
                      )}
                    </View>
                  )}

                  {isRevealed && item.isFake && (
                    <View style={styles.fakeBadge}>
                      <CrossIcon size={16} color={colors.white} />
                    </View>
                  )}
                  {correctPick && (
                    <View style={styles.correctBadge}>
                      <CheckIcon size={16} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reveal reason after pick */}
          {picked !== null && (
            <View style={styles.reasonCard}>
              <Text style={styles.reasonTitle}>
                {picked === round.fakeIndex ? 'Correct!' : 'Wrong!'}
              </Text>
              <Text style={styles.reasonText}>{round.fakeFlag.reason}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Next button */}
      {picked !== null && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {isLastRound ? 'See Results' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: {
    padding: 8,
    width: 60,
  },
  exitText: {
    fontSize: 13,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.5,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  centerInfo: {
    alignItems: 'center',
  },
  counter: {
    ...typography.bodyBold,
    color: colors.text,
  },
  score: {
    ...typography.caption,
    color: colors.success,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  prompt: {
    ...typography.headingUpper,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
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
  gridCardFake: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 39, 28, 0.06)',
  },
  gridCardCorrect: {
    borderColor: colors.success,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  gridCardWrong: {
    borderColor: colors.error,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  flagWrapper: {
    width: 140,
    height: 93,
    overflow: 'hidden',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.rule2,
    backgroundColor: colors.surfaceSecondary,
  },
  revealInfo: {
    alignItems: 'center',
    gap: 2,
  },
  fakeLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 14,
    letterSpacing: 2,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  realName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.ink,
    textAlign: 'center',
  },
  realRegion: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textTertiary,
  },
  fakeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  reasonTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  reasonText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  nextButton: {
    ...buttons.primary,
  },
  nextButtonText: {
    ...buttons.primaryText,
  },
});
