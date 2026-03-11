import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, spacing } from '../utils/theme';
import { getTotalFlagCount } from '../data';
import { initAudio, hapticTap } from '../utils/feedback';
import { RootStackParamList } from '../types/navigation';
import { GameMode } from '../types';
import { LightningIcon, CrosshairIcon, BarChartIcon, GlobeIcon } from '../components/Icons';
import ChipSelector from '../components/ChipSelector';

const MODE_OPTIONS = [
  { value: 'easy' as GameMode, label: '2' },
  { value: 'medium' as GameMode, label: '4' },
  { value: 'hard' as GameMode, label: 'Type' },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const GRID_SPACING = 80;

function GridLines() {
  const screenWidth = Dimensions.get('window').width;
  const lineCount = Math.floor(screenWidth / GRID_SPACING);

  return (
    <View style={styles.gridContainer} pointerEvents="none">
      {Array.from({ length: lineCount }, (_, i) => (
        <View
          key={i}
          style={[styles.gridLine, { left: (i + 1) * GRID_SPACING }]}
        />
      ))}
    </View>
  );
}

function FadeUp({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const totalFlags = getTotalFlagCount();
  const [mode, setMode] = useState<GameMode>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionCountAll, setQuestionCountAll] = useState(false);

  useEffect(() => {
    initAudio();
  }, []);

  const countOptions = useMemo(() => [
    ...QUESTION_COUNTS.map((c) => ({ value: c, label: String(c) })),
    { value: -1, label: 'All' },
  ], []);

  const selectedCount = questionCountAll ? -1 : questionCount;

  const handleCountSelect = (value: number) => {
    hapticTap();
    if (value === -1) {
      setQuestionCountAll(true);
    } else {
      setQuestionCountAll(false);
      setQuestionCount(value);
    }
  };

  const handleModeSelect = (value: GameMode) => {
    hapticTap();
    setMode(value);
  };

  const quickPlay = () => {
    hapticTap();
    navigation.navigate('Game', {
      config: { mode, category: 'all', questionCount: questionCountAll ? totalFlags : questionCount, displayMode: 'flag' },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <GridLines />

      <View style={styles.content}>
        <FadeUp delay={0}>
          <View style={styles.headerTopRule} />
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.logotypeMain} accessibilityRole="header">
                Flag{'\n'}
                <Text style={styles.logotypeItalic}>That</Text>
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.countNumber}>{totalFlags}</Text>
              <Text style={styles.countLabel}>Countries</Text>
            </View>
          </View>
        </FadeUp>

        <FadeUp delay={220}>
          <TouchableOpacity
            style={styles.cardHero}
            onPress={quickPlay}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Play ${questionCountAll ? `all ${totalFlags}` : questionCount} random flags`}
          >
            <View style={styles.cardHeroBar} />
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <LightningIcon size={22} color={colors.white} filled />
              </View>
              <View>
                <Text style={styles.heroTitle}>Play</Text>
                <Text style={styles.heroSub}>
                  {questionCountAll ? `All ${totalFlags}` : questionCount} random flags {'\u00A0\u00B7\u00A0'} all {totalFlags}
                </Text>
              </View>
            </View>
            <Text style={styles.heroArrow}>{'\u2192'}</Text>
          </TouchableOpacity>

          <View style={styles.chipRow}>
            <ChipSelector
              label="Cards"
              options={countOptions}
              selected={selectedCount}
              onSelect={handleCountSelect}
            />
          </View>

          <View style={styles.chipRow}>
            <ChipSelector
              label="Game Mode"
              options={MODE_OPTIONS}
              selected={mode}
              onSelect={handleModeSelect}
            />
          </View>
        </FadeUp>
      </View>

      <View style={styles.bottomNav}>
        <View style={styles.bottomNavTopRule} />
        <View style={styles.bottomNavInner}>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={quickPlay}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Quick Play"
          >
            <LightningIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Quick Play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => { hapticTap(); navigation.navigate('GameSetup'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Game Mode setup"
          >
            <CrosshairIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Game Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => {
              hapticTap();
              navigation.navigate('FlagFlash', {
                config: { mode: 'flagflash', category: 'all', questionCount: 999, timeLimit: 60 },
              });
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="FlagFlash party mode"
          >
            <LightningIcon size={16} color={colors.ink} filled={false} />
            <Text style={styles.bottomNavLabel}>FlagFlash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => { hapticTap(); navigation.navigate('Stats'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View statistics"
          >
            <BarChartIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => { hapticTap(); navigation.navigate('Browse'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Browse all flags"
          >
            <GlobeIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Browse</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.rule,
    opacity: 0.35,
  },
  headerTopRule: {
    width: '100%',
    height: 3,
    backgroundColor: colors.accent,
    marginBottom: spacing.md,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  logotypeMain: {
    fontFamily: fontFamily.display,
    fontSize: 64,
    lineHeight: 58,
    color: colors.ink,
    letterSpacing: -1.3,
  },
  logotypeItalic: {
    fontFamily: fontFamily.displayItalic,
    color: colors.accent,
  },
  headerRight: {
    alignItems: 'flex-end',
    paddingBottom: spacing.xs,
  },
  countNumber: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    lineHeight: 52,
    color: colors.ink,
    letterSpacing: -1.6,
  },
  countLabel: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.slate,
    marginTop: spacing.xxs,
  },
  cardHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  cardHeroBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.accent,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 32,
    letterSpacing: 3,
    textTransform: 'uppercase',
    lineHeight: 32,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.whiteAlpha45,
  },
  heroArrow: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 20,
    color: colors.whiteAlpha45,
  },
  chipRow: {
    marginTop: spacing.sm,
  },
  bottomNav: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  bottomNavTopRule: {
    height: 2,
    backgroundColor: colors.ink,
  },
  bottomNavInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bottomNavItem: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bottomNavLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.ink,
  },
});
