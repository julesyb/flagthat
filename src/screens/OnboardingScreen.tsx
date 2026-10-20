import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fontFamily, fontSize, spacing, borderRadius, buildButtons, typography, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getCategoryCount } from '../data';
import { hapticTap } from '../utils/feedback';
import { skipOnboarding } from '../utils/storage';
import { RootStackParamList } from '../types/navigation';
import { CategoryId, BASELINE_REGIONS, GameConfig } from '../types';
import { PlayIcon, CrosshairIcon, CompassIcon, FlagIcon, ClockIcon } from '../components/Icons';
import ScreenContainer from '../components/ScreenContainer';
import { t } from '../utils/i18n';
import { UNLIMITED_QUESTIONS, TIMEATTACK_DEFAULT_TIME } from '../utils/config';

// The "Give it a try" quick-play always launches 10 flags at medium difficulty.
const TRY_COUNT = 10;
const TRY_MODE = 'medium' as const;

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

// One of the four primary action squares on the onboarding grid.
interface ActionSquare {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  onPress: () => void;
  a11yLabel: string;
  a11yHint?: string;
}

export default function OnboardingScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Mark onboarding done, then reset the stack so Home is the root and the
  // chosen destination sits on top (leaving it lands on Home, never here).
  const completeAndGo = (config: GameConfig): void => {
    skipOnboarding().finally(() => {
      navigation.reset({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'Game', params: { config } }],
      });
    });
  };

  const completeAndGoSetup = (): void => {
    skipOnboarding().finally(() => {
      navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'GameSetup' }] });
    });
  };

  const completeAndGoBrowse = (): void => {
    skipOnboarding().finally(() => {
      navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Browse' }] });
    });
  };

  // ── "Give it a try": straight into 10 medium flags ──
  const playTry = () => {
    hapticTap();
    completeAndGo({ mode: TRY_MODE, category: 'all', questionCount: TRY_COUNT, displayMode: 'flag' });
  };

  // ── Primary action squares (data-driven) ──
  const firstRegion = BASELINE_REGIONS[0];
  const squares: ActionSquare[] = [
    {
      key: 'baseline',
      title: t('onboarding.baselineProgress'),
      subtitle: t('onboarding.regionsComplete', { count: 0, total: BASELINE_REGIONS.length }),
      icon: <CrosshairIcon size={22} color={colors.modeBlue} />,
      accent: colors.modeBlue,
      onPress: () => {
        hapticTap();
        const count = getCategoryCount(firstRegion as CategoryId);
        completeAndGo({ mode: 'baseline', category: firstRegion as CategoryId, questionCount: count, displayMode: 'flag' });
      },
      a11yLabel: t('onboarding.baselineProgress'),
      a11yHint: t('a11y.beginsBaseline'),
    },
    {
      key: 'choose',
      title: t('home.chooseYourGame'),
      subtitle: t('home.chooseYourGameDesc'),
      icon: <CompassIcon size={22} color={colors.modePurple} />,
      accent: colors.modePurple,
      onPress: () => {
        hapticTap();
        completeAndGoSetup();
      },
      a11yLabel: t('home.chooseYourGame'),
      a11yHint: t('a11y.opensMode'),
    },
    {
      key: 'practice',
      title: t('home.practice'),
      subtitle: t('home.practiceDesc'),
      icon: <FlagIcon size={22} color={colors.modeGreen} />,
      accent: colors.modeGreen,
      onPress: () => {
        hapticTap();
        completeAndGoBrowse();
      },
      a11yLabel: t('home.practice'),
      a11yHint: t('home.practiceDesc'),
    },
    {
      key: 'timed',
      title: t('home.timedQuiz'),
      subtitle: t('home.timedQuizTag'),
      icon: <ClockIcon size={22} color={colors.modeRed} />,
      accent: colors.modeRed,
      onPress: () => {
        hapticTap();
        completeAndGo({ mode: 'timeattack', category: 'all', questionCount: UNLIMITED_QUESTIONS, timeLimit: TIMEATTACK_DEFAULT_TIME, displayMode: 'flag' });
      },
      a11yLabel: t('a11y.playMode', { mode: t('home.timedQuiz') }),
      a11yHint: t('a11y.opensMode'),
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
          </View>

          {/* ── WELCOME ── */}
          <View style={styles.welcomeWrap}>
            <Text style={styles.welcomeTitle}>{t('onboarding.welcomeTitle')}</Text>
            <Text style={styles.welcomeSub}>{t('onboarding.welcomeSub')}</Text>
          </View>

          {/* ── GIVE IT A TRY (primary quick-play) ── */}
          <View style={styles.tryWrap}>
            <TouchableOpacity
              style={styles.tryBtn}
              onPress={playTry}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.giveItATry')}
            >
              <Text style={styles.tryBtnText}>{t('onboarding.giveItATry')}</Text>
              <PlayIcon size={15} color={colors.playText} />
            </TouchableOpacity>
          </View>

          {/* ── ACTION SQUARES ── */}
          <View style={styles.grid}>
            {squares.map((sq) => (
              <TouchableOpacity
                key={sq.key}
                style={styles.square}
                onPress={sq.onPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={sq.a11yLabel}
                accessibilityHint={sq.a11yHint}
              >
                <View style={[styles.squareIcon, { backgroundColor: sq.accent + '22' }]}>
                  {sq.icon}
                </View>
                <View style={styles.squareText}>
                  <Text style={styles.squareTitle} numberOfLines={2}>{sq.title}</Text>
                  <Text style={styles.squareSub} numberOfLines={2}>{sq.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: spacing.md }} />
        </ScreenContainer>
      </ScrollView>
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
    paddingBottom: spacing.xl,
  },

  // ── Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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

  // ── Welcome
  welcomeWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  welcomeTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
    lineHeight: 40,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  welcomeSub: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ── Give it a try (primary quick-play)
  tryWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  tryBtn: {
    ...btn.primary,
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  tryBtnText: {
    ...btn.primaryText,
  },

  // ── Action squares grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  square: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 132,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  squareIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  squareText: {
    gap: spacing.xxs,
  },
  squareTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.body,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  squareSub: {
    ...typography.micro,
    color: colors.textTertiary,
  },
}); };
