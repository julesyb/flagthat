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
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spacing, typography, fontFamily, fontSize, buildButtons, borderRadius, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { hapticTap, hapticCorrect, hapticWrong, playWrongSound } from '../utils/feedback';
import { updateStats, updateFlagResults } from '../utils/storage';
import { shuffleArray, getStreakFromResults } from '../utils/gameEngine';
import { t } from '../utils/i18n';
import { flagName } from '../data/countryNames';
import { RootStackParamList } from '../types/navigation';
import { FlagItem, GameResult } from '../types';
import { countCorrect, countWrong } from '../utils/gameHelpers';
import { countries } from '../data/countries';
import FlagImage from '../components/FlagImage';
import { CheckIcon, CrossIcon } from '../components/Icons';
import GameTopBar from '../components/GameTopBar';
import ScreenContainer from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'FlagImpostor'>;

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffleArray(arr).slice(0, count);
}

// ── Impostor flags: real flag layouts recolored with non-traditional colors ──

// Common flag colors - the random pairing with a mismatched template makes the impostor
const IMPOSTOR_COLORS = [
  '#CE1126', // red
  '#003DA5', // blue
  '#009739', // green
  '#FFCD00', // yellow
  '#FFFFFF', // white
  '#000000', // black
  '#FF6600', // orange
  '#00A9E0', // sky blue
  '#7B3F00', // brown
  '#502379', // purple
  '#D21034', // crimson
  '#007A5E', // teal green
];

interface FlagTemplate {
  name: string;
  colorSlots: number;
}

// Each template mirrors the layout of a real national flag
const FLAG_TEMPLATES: FlagTemplate[] = [
  { name: 'japan', colorSlots: 2 },
  { name: 'palau', colorSlots: 2 },
  { name: 'france', colorSlots: 3 },
  { name: 'germany', colorSlots: 3 },
  { name: 'indonesia', colorSlots: 2 },
  { name: 'sweden', colorSlots: 2 },
  { name: 'norway', colorSlots: 3 },
  { name: 'czech', colorSlots: 3 },
  { name: 'madagascar', colorSlots: 3 },
  { name: 'thailand', colorSlots: 3 },
  { name: 'tanzania', colorSlots: 3 },
  { name: 'jamaica', colorSlots: 3 },
  { name: 'cuba', colorSlots: 3 },
  { name: 'panama', colorSlots: 3 },
  { name: 'colombia', colorSlots: 3 },
  { name: 'chile', colorSlots: 3 },
  { name: 'botswana', colorSlots: 3 },
  { name: 'seychelles', colorSlots: 3 },
];

// Blocklist: template + sorted color combos that match real national flags
const REAL_FLAG_COMBOS = new Set([
  // japan/palau (circle layouts)
  'japan:#CE1126,#FFFFFF',             // Japan
  'japan:#003DA5,#FFCD00',             // Palau
  'japan:#009739,#CE1126',             // Bangladesh
  'palau:#CE1126,#FFFFFF',             // Japan
  'palau:#003DA5,#FFCD00',             // Palau
  'palau:#009739,#CE1126',             // Bangladesh
  // france (vertical triband)
  'france:#003DA5,#CE1126,#FFFFFF',    // France
  'france:#009739,#CE1126,#FFFFFF',    // Italy, Mexico
  'france:#009739,#FF6600,#FFFFFF',    // Ireland, Ivory Coast
  'france:#000000,#CE1126,#FFCD00',    // Belgium
  'france:#003DA5,#CE1126,#FFCD00',    // Chad, Romania
  'france:#009739,#CE1126,#FFCD00',    // Mali, Guinea, Cameroon, Senegal
  'france:#009739,#009739,#FFFFFF',    // Nigeria
  'france:#CE1126,#CE1126,#FFFFFF',    // Peru
  // germany (horizontal triband)
  'germany:#000000,#CE1126,#FFCD00',   // Germany
  'germany:#003DA5,#CE1126,#FFFFFF',   // Netherlands, Luxembourg, Croatia
  'germany:#009739,#CE1126,#FFFFFF',   // Hungary, Bulgaria, Iran
  'germany:#009739,#CE1126,#FFCD00',   // Lithuania, Bolivia, Ethiopia, Ghana
  'germany:#000000,#CE1126,#FFFFFF',   // Yemen, Egypt, Iraq, Syria
  'germany:#000000,#003DA5,#FFFFFF',   // Estonia
  'germany:#000000,#009739,#CE1126',   // Afghanistan, Libya, Malawi
  'germany:#003DA5,#009739,#FFFFFF',   // Sierra Leone, Uzbekistan
  'germany:#003DA5,#009739,#FFCD00',   // Gabon
  'germany:#003DA5,#CE1126,#FF6600',   // Armenia
  'germany:#00A9E0,#00A9E0,#FFFFFF',   // Argentina
  'germany:#CE1126,#CE1126,#FFFFFF',   // Austria, Latvia
  // indonesia (horizontal bicolor)
  'indonesia:#CE1126,#FFFFFF',          // Indonesia, Monaco, Poland
  'indonesia:#003DA5,#FFCD00',          // Ukraine
  'indonesia:#00A9E0,#FFCD00',          // Ukraine (sky blue)
  'indonesia:#003DA5,#CE1126',          // Haiti, Liechtenstein
  // sweden (nordic cross)
  'sweden:#003DA5,#FFCD00',             // Sweden
  'sweden:#CE1126,#FFFFFF',             // Denmark
  'sweden:#003DA5,#FFFFFF',             // Finland
  // norway (outlined nordic cross)
  'norway:#003DA5,#CE1126,#FFFFFF',    // Norway, Iceland
  // czech (hoist triangle + bicolor)
  'czech:#003DA5,#CE1126,#FFFFFF',     // Czech Republic
  'czech:#003DA5,#009739,#FFFFFF',     // Djibouti
  // madagascar (vertical band + 2 horizontal)
  'madagascar:#009739,#CE1126,#FFFFFF', // Madagascar
  'madagascar:#009739,#CE1126,#FFCD00', // Benin
  // thailand (5 symmetric stripes)
  'thailand:#003DA5,#CE1126,#FFFFFF',  // Thailand, Costa Rica
  // tanzania (diagonal band)
  'tanzania:#000000,#009739,#00A9E0',  // Tanzania
  'tanzania:#009739,#CE1126,#FFCD00',  // Republic of Congo
  // jamaica (saltire)
  'jamaica:#000000,#009739,#FFCD00',   // Jamaica
  // cuba (stripes + triangle)
  'cuba:#003DA5,#CE1126,#FFFFFF',      // Cuba
  // panama (quartered)
  'panama:#003DA5,#CE1126,#FFFFFF',    // Panama
  // colombia (unequal horizontal)
  'colombia:#003DA5,#CE1126,#FFCD00',  // Colombia, Ecuador, Venezuela
  // chile (bicolor + canton)
  'chile:#003DA5,#CE1126,#FFFFFF',     // Chile
  // botswana (center stripe)
  'botswana:#000000,#00A9E0,#FFFFFF',  // Botswana
  // seychelles (radiating)
  'seychelles:#003DA5,#009739,#CE1126', // Seychelles
]);

interface FakeFlag {
  templateIndex: number;
  colors: string[];
  reason: string;
}

function generateFakeFlag(): FakeFlag {
  for (let attempt = 0; attempt < 20; attempt++) {
    const templateIndex = Math.floor(Math.random() * FLAG_TEMPLATES.length);
    const template = FLAG_TEMPLATES[templateIndex];
    const shuffled = shuffleArray([...IMPOSTOR_COLORS]);
    const flagColors = shuffled.slice(0, template.colorSlots);

    const sortedColors = [...flagColors].sort().join(',');
    const comboKey = `${template.name}:${sortedColors}`;
    if (REAL_FLAG_COMBOS.has(comboKey)) continue;

    return {
      templateIndex,
      colors: flagColors,
      reason: 'Real flag layout recolored - does not match any real flag',
    };
  }

  // Fallback: seychelles with purple + brown + teal (no real flag match)
  return {
    templateIndex: FLAG_TEMPLATES.findIndex((t) => t.name === 'seychelles'),
    colors: ['#502379', '#7B3F00', '#007A5E'],
    reason: 'Real flag layout recolored - does not match any real flag',
  };
}

function renderTemplateContent(name: string, c: string[], w: number, h: number): React.ReactNode {
  switch (name) {
    // Solid background + centered circle (Japan)
    case 'japan':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.22} fill={c[1]} />
        </>
      );
    // Solid background + off-center circle (Palau)
    case 'palau':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Circle cx={w * 0.38} cy={h / 2} r={Math.min(w, h) * 0.22} fill={c[1]} />
        </>
      );
    // Vertical triband (France)
    case 'france':
      return (
        <>
          <Rect x={0} y={0} width={w / 3} height={h} fill={c[0]} />
          <Rect x={w / 3} y={0} width={w / 3} height={h} fill={c[1]} />
          <Rect x={(w / 3) * 2} y={0} width={w / 3} height={h} fill={c[2]} />
        </>
      );
    // Horizontal triband (Germany)
    case 'germany':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h / 3} fill={c[0]} />
          <Rect x={0} y={h / 3} width={w} height={h / 3} fill={c[1]} />
          <Rect x={0} y={(h / 3) * 2} width={w} height={h / 3} fill={c[2]} />
        </>
      );
    // Horizontal bicolor (Indonesia)
    case 'indonesia':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h / 2} fill={c[0]} />
          <Rect x={0} y={h / 2} width={w} height={h / 2} fill={c[1]} />
        </>
      );
    // Nordic cross (Sweden)
    case 'sweden': {
      const barW = h * 0.18;
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Rect x={0} y={(h - barW) / 2} width={w} height={barW} fill={c[1]} />
          <Rect x={w * 0.33 - barW / 2} y={0} width={barW} height={h} fill={c[1]} />
        </>
      );
    }
    // Outlined Nordic cross (Norway)
    case 'norway': {
      const outerW = h * 0.22;
      const innerW = h * 0.12;
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Rect x={0} y={(h - outerW) / 2} width={w} height={outerW} fill={c[1]} />
          <Rect x={w * 0.33 - outerW / 2} y={0} width={outerW} height={h} fill={c[1]} />
          <Rect x={0} y={(h - innerW) / 2} width={w} height={innerW} fill={c[2]} />
          <Rect x={w * 0.33 - innerW / 2} y={0} width={innerW} height={h} fill={c[2]} />
        </>
      );
    }
    // Hoist triangle + horizontal bicolor (Czech Republic)
    case 'czech':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h / 2} fill={c[0]} />
          <Rect x={0} y={h / 2} width={w} height={h / 2} fill={c[1]} />
          <Path d={`M 0,0 L ${w * 0.42},${h / 2} L 0,${h} Z`} fill={c[2]} />
        </>
      );
    // Vertical hoist band + 2 horizontal bands (Madagascar)
    case 'madagascar':
      return (
        <>
          <Rect x={0} y={0} width={w / 3} height={h} fill={c[0]} />
          <Rect x={w / 3} y={0} width={(w / 3) * 2} height={h / 2} fill={c[1]} />
          <Rect x={w / 3} y={h / 2} width={(w / 3) * 2} height={h / 2} fill={c[2]} />
        </>
      );
    // 5 symmetric horizontal stripes (Thailand)
    case 'thailand': {
      const sh = h / 6;
      return (
        <>
          <Rect x={0} y={0} width={w} height={sh} fill={c[0]} />
          <Rect x={0} y={sh} width={w} height={sh} fill={c[1]} />
          <Rect x={0} y={sh * 2} width={w} height={sh * 2} fill={c[2]} />
          <Rect x={0} y={sh * 4} width={w} height={sh} fill={c[1]} />
          <Rect x={0} y={sh * 5} width={w} height={sh} fill={c[0]} />
        </>
      );
    }
    // Diagonal band corner to corner (Tanzania)
    case 'tanzania':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Path d={`M ${w},0 L ${w},${h} L 0,${h} Z`} fill={c[1]} />
          <Path d={`M 0,${h} L 0,${h * 0.7} L ${w},0 L ${w},${h * 0.3} Z`} fill={c[2]} />
        </>
      );
    // Saltire / X cross (Jamaica)
    case 'jamaica': {
      const inset = Math.min(w, h) * 0.08;
      const cx = w / 2;
      const cy = h / 2;
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Path d={`M ${inset},0 L ${w - inset},0 L ${cx},${cy - inset} Z`} fill={c[1]} />
          <Path d={`M ${inset},${h} L ${w - inset},${h} L ${cx},${cy + inset} Z`} fill={c[1]} />
          <Path d={`M 0,${inset} L 0,${h - inset} L ${cx - inset},${cy} Z`} fill={c[2]} />
          <Path d={`M ${w},${inset} L ${w},${h - inset} L ${cx + inset},${cy} Z`} fill={c[2]} />
        </>
      );
    }
    // 5 horizontal stripes + hoist triangle (Cuba)
    case 'cuba': {
      const sh = h / 5;
      return (
        <>
          <Rect x={0} y={0} width={w} height={sh} fill={c[0]} />
          <Rect x={0} y={sh} width={w} height={sh} fill={c[1]} />
          <Rect x={0} y={sh * 2} width={w} height={sh} fill={c[0]} />
          <Rect x={0} y={sh * 3} width={w} height={sh} fill={c[1]} />
          <Rect x={0} y={sh * 4} width={w} height={sh} fill={c[0]} />
          <Path d={`M 0,0 L ${w * 0.35},${h / 2} L 0,${h} Z`} fill={c[2]} />
        </>
      );
    }
    // Quartered (Panama)
    case 'panama':
      return (
        <>
          <Rect x={0} y={0} width={w / 2} height={h / 2} fill={c[0]} />
          <Rect x={w / 2} y={0} width={w / 2} height={h / 2} fill={c[1]} />
          <Rect x={0} y={h / 2} width={w / 2} height={h / 2} fill={c[2]} />
          <Rect x={w / 2} y={h / 2} width={w / 2} height={h / 2} fill={c[0]} />
        </>
      );
    // Unequal horizontal bands - top half + two quarters (Colombia)
    case 'colombia':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h / 2} fill={c[0]} />
          <Rect x={0} y={h / 2} width={w} height={h / 4} fill={c[1]} />
          <Rect x={0} y={h * 0.75} width={w} height={h / 4} fill={c[2]} />
        </>
      );
    // Bicolor with canton (Chile)
    case 'chile':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h / 2} fill={c[0]} />
          <Rect x={0} y={h / 2} width={w} height={h / 2} fill={c[1]} />
          <Rect x={0} y={0} width={w / 3} height={h / 2} fill={c[2]} />
        </>
      );
    // Horizontal with center stripe (Botswana)
    case 'botswana': {
      const stripeH = h * 0.2;
      const outlineH = h * 0.04;
      const cy = h / 2;
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Rect x={0} y={cy - stripeH / 2 - outlineH} width={w} height={outlineH} fill={c[1]} />
          <Rect x={0} y={cy - stripeH / 2} width={w} height={stripeH} fill={c[2]} />
          <Rect x={0} y={cy + stripeH / 2} width={w} height={outlineH} fill={c[1]} />
        </>
      );
    }
    // Radiating sectors from bottom-left corner (Seychelles)
    case 'seychelles':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} fill={c[0]} />
          <Path d={`M 0,${h} L ${w * 0.5},0 L ${w},0 L ${w},${h} Z`} fill={c[1]} />
          <Path d={`M 0,${h} L ${w},${h * 0.33} L ${w},${h} Z`} fill={c[2]} />
        </>
      );
    default:
      return <Rect x={0} y={0} width={w} height={h} fill={c[0]} />;
  }
}

function FakeFlagSvg({ flag, width, height }: { flag: FakeFlag; width: number; height: number }) {
  const template = FLAG_TEMPLATES[flag.templateIndex];
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {renderTemplateContent(template.name, flag.colors, width, height)}
    </Svg>
  );
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { config } = route.params;
  const rounds = useMemo(() => generateRounds(config.questionCount), [config.questionCount]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const roundStartTime = useRef(Date.now());

  const guessLimit = config.guessLimit ?? 0;
  const wrongCount = countWrong(results);

  const round = rounds[roundIndex] ?? null;
  const isLastRound = roundIndex >= rounds.length - 1;
  const correctCount = countCorrect(results);

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
    const userLabel = tappedFlag.isFake ? t('impostor.fakeFlag') : tappedFlag.flag!.name;

    setResults((prev) => [...prev, {
      question: { flag: round.realFlags[0], options: round.realFlags.map((f) => f.name) },
      userAnswer: userLabel,
      correct: isCorrect,
      timeTaken: Date.now() - roundStartTime.current,
    }]);
  };

  const finishGame = (finalResults: GameResult[]) => {
    navigation.replace('Results', { results: finalResults, config });
  };

  const handleNext = () => {
    const isEliminated = guessLimit > 0 && countWrong(results) >= guessLimit;
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
      <ScreenContainer flex game>
      <GameTopBar
        onExit={() => navigation.goBack()}
        center={
          <View style={styles.centerInfo}>
            <Text style={styles.counter}>{t('game.questionOf', { current: roundIndex + 1, total: rounds.length })}</Text>
            <Text style={styles.scoreText}>{t('game.correctCount', { count: correctCount })}</Text>
          </View>
        }
        right={
          guessLimit > 0 ? (
            <Text style={styles.livesText}>{guessLimit - wrongCount === 1 ? t('game.life', { count: Math.max(0, guessLimit - wrongCount) }) : t('game.lives', { count: Math.max(0, guessLimit - wrongCount) })}</Text>
          ) : undefined
        }
      />

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
                  accessibilityRole="button"
                  accessibilityLabel={
                    isRevealed
                      ? item.isFake
                        ? t('impostor.fake')
                        : flagName(item.flag!)
                      : `Flag option ${item.index + 1}`
                  }
                  accessibilityHint={picked === null ? "Tap to select as the impostor flag" : undefined}
                  accessibilityState={{ disabled: picked !== null }}
                >
                  {item.isFake ? (
                    <View style={styles.flagWrapper}>
                      <FakeFlagSvg flag={item.fakeFlag!} width={FLAG_W} height={FLAG_H} />
                    </View>
                  ) : (
                    <FlagImage countryCode={item.flag!.id} size="medium" />
                  )}

                  {isRevealed && (
                    <View style={styles.revealInfo}>
                      {item.isFake ? (
                        <Text style={styles.fakeLabel}>{t('impostor.fake')}</Text>
                      ) : (
                        <>
                          <Text style={styles.realName}>{flagName(item.flag!)}</Text>
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

        </Animated.View>
      </ScrollView>

      {picked !== null && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleNext} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={isLastRound ? t('common.seeResults') : t('common.next')}>
            <Text style={styles.actionButtonText}>{isLastRound ? t('common.seeResults') : t('common.next')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => {
  const btn = buildButtons(colors);
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  fakeLabel: { ...typography.actionLabel, letterSpacing: 1.2, color: colors.accent },
  realName: { ...typography.captionStrong, color: colors.ink, textAlign: 'center' },
  realRegion: { ...typography.micro, color: colors.textTertiary },
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
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  actionButton: { ...btn.primary },
  actionButtonText: { ...btn.primaryText },
}); };
