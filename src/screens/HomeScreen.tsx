import React, { useEffect, useRef, useState } from 'react';
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
import { colors, fontFamily } from '../utils/theme';
import { getTotalFlagCount } from '../data';
import { initAudio, hapticTap } from '../utils/feedback';
import { getStats } from '../utils/storage';
import { RootStackParamList } from '../types/navigation';
import { GameMode } from '../types';
import { LightningIcon, CrosshairIcon, BarChartIcon, GlobeIcon } from '../components/Icons';

const MODES: { key: GameMode; label: string }[] = [
  { key: 'easy', label: '2' },
  { key: 'medium', label: '4' },
  { key: 'hard', label: 'Type' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const GRID_SPACING = 80;

// ─── Background Grid ─────────────────────────────────────────
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

// ─── Fade-up wrapper ─────────────────────────────────────────
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

// ─── Main Screen ─────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const totalFlags = getTotalFlagCount();
  const [mastered, setMastered] = useState(0);
  const [mode, setMode] = useState<GameMode>('medium');
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getStats().then((stats) => {
        setMastered(stats.totalCorrect);
      });
    });
    return unsubscribe;
  }, [navigation]);

  // Animate progress bar fill
  useEffect(() => {
    const target = totalFlags > 0 ? Math.min(mastered / totalFlags, 1) : 0;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 1000,
      delay: 700,
      useNativeDriver: false,
    }).start();
  }, [mastered, totalFlags]);

  const progressPct = totalFlags > 0 ? Math.min(Math.round((mastered / totalFlags) * 100), 100) : 0;

  const quickPlay = () => {
    hapticTap();
    navigation.navigate('Game', {
      config: { mode, category: 'all', questionCount: 10 },
    });
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <GridLines />

      <View style={styles.content}>
        {/* ── HEADER ── */}
        <FadeUp delay={0}>
          <View style={styles.headerTopRule} />
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.eyebrow}>
                Flag Identification {'\u00B7'} {totalFlags} Countries
              </Text>
              <Text style={styles.logotypeMain}>
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

        {/* ── BYLINE ── */}
        <FadeUp delay={80}>
          <View style={styles.byline}>
            <Text style={styles.bylineText}>
              Geography {'\u00B7'} Cartography {'\u00B7'} Mastery
            </Text>
            <View style={styles.bylineDots}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.bylineDot} />
              ))}
            </View>
          </View>
        </FadeUp>

        {/* ── PROGRESS ── */}
        <FadeUp delay={140}>
          <View style={styles.progressBlock}>
            <View style={styles.progressLeft}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Mastery Progress</Text>
                <Text style={styles.progressFraction}>
                  {mastered} of {totalFlags}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
            <View style={styles.progressPctBox}>
              <Text style={styles.progressPctNumber}>{progressPct}%</Text>
              <Text style={styles.progressPctLabel}>Complete</Text>
            </View>
          </View>
        </FadeUp>

        {/* ── SINGLE CTA ── */}
        <FadeUp delay={220}>
          <TouchableOpacity
            style={styles.cardHero}
            onPress={quickPlay}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeroBar} />
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <LightningIcon size={22} color={colors.white} filled />
              </View>
              <View>
                <Text style={styles.heroTitle}>Play</Text>
                <Text style={styles.heroSub}>
                  10 random flags {'\u00A0\u00B7\u00A0'} all {totalFlags}
                </Text>
              </View>
            </View>
            <Text style={styles.heroArrow}>{'\u2192'}</Text>
          </TouchableOpacity>

          {/* ── MODE SWITCHER ── */}
          <View style={styles.modeSwitcher}>
            <Text style={styles.modeSwitcherLabel}>Mode</Text>
            <View style={styles.modeSwitcherRow}>
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeChip, mode === m.key && styles.modeChipActive]}
                  onPress={() => { hapticTap(); setMode(m.key); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modeChipText, mode === m.key && styles.modeChipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FadeUp>
      </View>

      {/* ── BOTTOM NAV BAR ── */}
      <View style={styles.bottomNav}>
        <View style={styles.bottomNavTopRule} />
        <View style={styles.bottomNavInner}>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={quickPlay}
            activeOpacity={0.7}
          >
            <LightningIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Quick Play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => { hapticTap(); navigation.navigate('GameSetup'); }}
            activeOpacity={0.7}
          >
            <CrosshairIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Custom</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => { hapticTap(); navigation.navigate('Stats'); }}
            activeOpacity={0.7}
          >
            <BarChartIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => { hapticTap(); navigation.navigate('Browse'); }}
            activeOpacity={0.7}
          >
            <GlobeIcon size={16} color={colors.ink} />
            <Text style={styles.bottomNavLabel}>Browse</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
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
    paddingHorizontal: 40,
    justifyContent: 'center',
  },

  // Grid
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

  // Header
  headerTopRule: {
    width: '100%',
    height: 3,
    backgroundColor: colors.accent,
    marginBottom: 16,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  eyebrow: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 10,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: colors.slate,
    marginBottom: 8,
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
    paddingBottom: 4,
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
    marginTop: 2,
  },

  // Byline
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 20,
  },
  bylineText: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  bylineDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  bylineDot: {
    width: 4,
    height: 4,
    backgroundColor: colors.rule2,
  },

  // Progress
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 24,
  },
  progressLeft: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  progressLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  progressFraction: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 11,
    letterSpacing: 0.66,
    color: colors.slate,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.rule,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.ink,
  },
  progressPctBox: {
    width: 80,
    alignItems: 'flex-end',
  },
  progressPctNumber: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.56,
    lineHeight: 28,
  },
  progressPctLabel: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 9,
    letterSpacing: 1.62,
    textTransform: 'uppercase',
    color: colors.slate,
    marginTop: 2,
  },

  // Hero card
  cardHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    paddingVertical: 28,
    paddingHorizontal: 28,
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
    gap: 20,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    marginBottom: 4,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  heroArrow: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 20,
    color: 'rgba(255,255,255,0.4)',
  },

  // Mode switcher
  modeSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modeSwitcherLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  modeSwitcherRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modeChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.white,
  },
  modeChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  modeChipText: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  modeChipTextActive: {
    color: colors.white,
  },

  // Bottom nav
  bottomNav: {
    backgroundColor: colors.background,
    paddingBottom: 8,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  bottomNavTopRule: {
    height: 2,
    backgroundColor: colors.ink,
  },
  bottomNavInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  bottomNavItem: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bottomNavLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.ink,
  },
});
