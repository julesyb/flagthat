import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontFamily, fontSize, spacing, borderRadius, shadows } from '../utils/theme';
import { getBaselineData, BaselineData, skipOnboarding } from '../utils/storage';
import { getCategoryCount, getAllFlags } from '../data';
import { hapticTap } from '../utils/feedback';
import { CheckIcon, ChevronRightIcon, PlayIcon, BarChartIcon } from '../components/Icons';
import FlagImage from '../components/FlagImage';
import { RootStackParamList } from '../types/navigation';
import { BaselineRegionId, CategoryId, FlagItem } from '../types';
import { t } from '../utils/i18n';
import ScreenContainer from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const REGIONS: { id: BaselineRegionId; categoryId: CategoryId }[] = [
  { id: 'africa', categoryId: 'africa' },
  { id: 'asia', categoryId: 'asia' },
  { id: 'europe', categoryId: 'europe' },
  { id: 'americas', categoryId: 'americas' },
  { id: 'oceania', categoryId: 'oceania' },
];

// Pick 4 recognizable flags for the hero mosaic
const HERO_FLAGS = ['jp', 'br', 'gb', 'za'];

export default function OnboardingScreen({ navigation }: Props) {
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [showTests, setShowTests] = useState(false);

  // Animations
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(16)).current;
  const testsFade = useRef(new Animated.Value(0)).current;
  const testsSlide = useRef(new Animated.Value(16)).current;
  const flagAnims = useRef(HERO_FLAGS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Phase 1: Hero card slides in
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(heroSlide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    // Phase 2: Flag mosaic stagger in
    setTimeout(() => {
      Animated.stagger(
        120,
        flagAnims.map((a) =>
          Animated.spring(a, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        ),
      ).start();
    }, 300);

    // Phase 3: CTA buttons slide in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(btnSlide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 600);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getBaselineData().then((data) => {
        setBaseline(data);
        if (data && Object.keys(data.regions).length > 0 && !data.completedAt && !data.skipped) {
          setShowTests(true);
          testsFade.setValue(1);
          testsSlide.setValue(0);
        }
      });
    }, []),
  );

  const completedCount = baseline
    ? REGIONS.filter((r) => baseline.regions[r.id]).length
    : 0;
  const allDone = completedCount === REGIONS.length;

  const handleRegionPress = (region: BaselineRegionId) => {
    hapticTap();
    const count = getCategoryCount(region as CategoryId);
    navigation.navigate('Game', {
      config: {
        mode: 'baseline',
        category: region as CategoryId,
        questionCount: count,
        displayMode: 'flag',
      },
    });
  };

  const handleStartPlaying = async () => {
    hapticTap();
    await skipOnboarding();
    navigation.replace('Home');
  };

  const handleTestKnowledge = () => {
    hapticTap();
    setShowTests(true);
    Animated.parallel([
      Animated.timing(testsFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(testsSlide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleAllDone = () => {
    hapticTap();
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
          {/* Hero section with flag mosaic */}
          <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <View style={styles.heroInner}>
              <Text style={styles.welcomeText}>{t('onboarding.welcome')}</Text>
              <View style={styles.wordmark}>
                <Text style={styles.wmLine1}>Flag</Text>
                <Text style={styles.wmLine2}>That</Text>
              </View>
              <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
            </View>

            {/* Flag mosaic - 4 small flags fanned in the corner */}
            <View style={styles.flagMosaic}>
              {HERO_FLAGS.map((code, i) => (
                <Animated.View
                  key={code}
                  style={[
                    styles.flagThumb,
                    {
                      opacity: flagAnims[i],
                      transform: [
                        { scale: flagAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                        { rotate: `${-8 + i * 5}deg` },
                        { translateX: i * 6 },
                      ],
                    },
                  ]}
                >
                  <FlagImage countryCode={code} size="small" />
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {!showTests ? (
            /* ── Two-path choice ── */
            <Animated.View style={[styles.choiceWrap, { opacity: btnFade, transform: [{ translateY: btnSlide }] }]}>
              {/* Start Playing - primary CTA */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleStartPlaying}
                activeOpacity={0.85}
              >
                <View style={styles.primaryBtnIcon}>
                  <PlayIcon size={16} color={colors.white} />
                </View>
                <View style={styles.btnTextWrap}>
                  <Text style={styles.primaryBtnText}>{t('onboarding.startPlayingNow')}</Text>
                  <Text style={styles.primaryBtnSub}>{t('onboarding.startPlayingDesc')}</Text>
                </View>
                <ChevronRightIcon size={18} color={colors.white} />
              </TouchableOpacity>

              {/* Test Your Knowledge - secondary CTA */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleTestKnowledge}
                activeOpacity={0.85}
              >
                <View style={styles.secondaryBtnIcon}>
                  <BarChartIcon size={16} color={colors.ink} />
                </View>
                <View style={styles.btnTextWrap}>
                  <Text style={styles.secondaryBtnText}>{t('onboarding.testKnowledge')}</Text>
                  <Text style={styles.secondaryBtnSub}>{t('onboarding.testKnowledgeDesc')}</Text>
                </View>
                <ChevronRightIcon size={18} color={colors.ink} />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* ── Baseline test list ── */
            <Animated.View style={{ opacity: testsFade, transform: [{ translateY: testsSlide }] }}>
              <View style={styles.testHeader}>
                <Text style={styles.testTitle}>{t('onboarding.subtitle')}</Text>
                {!allDone && (
                  <TouchableOpacity onPress={handleStartPlaying} activeOpacity={0.6}>
                    <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(completedCount / REGIONS.length) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {t('onboarding.regionsComplete', { count: completedCount, total: REGIONS.length })}
                </Text>
              </View>

              {/* Region cards */}
              <View style={styles.regionList}>
                {REGIONS.map((region, index) => {
                  const result = baseline?.regions[region.id];
                  const isDone = !!result;
                  const flagCount = getCategoryCount(region.categoryId);

                  return (
                    <TouchableOpacity
                      key={region.id}
                      style={[
                        styles.regionCard,
                        isDone && styles.regionCardDone,
                        !isDone && styles.regionCardActive,
                      ]}
                      activeOpacity={isDone ? 1 : 0.85}
                      onPress={() => !isDone && handleRegionPress(region.id)}
                      disabled={isDone}
                    >
                      <View style={styles.regionLeft}>
                        {isDone ? (
                          <View style={styles.checkCircle}>
                            <CheckIcon size={16} color={colors.white} />
                          </View>
                        ) : (
                          <View style={styles.regionNumberActive}>
                            <Text style={styles.regionNumberTextActive}>
                              {index + 1}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.regionContent}>
                        <Text style={[styles.regionName, isDone && styles.regionNameDone]}>
                          {t(`categories.${region.id}`)}
                        </Text>
                        <Text style={styles.regionSub}>
                          {isDone
                            ? `${result!.correct}/${result!.total} correct, ${result!.accuracy}%`
                            : `${t('onboarding.flagCount', { count: flagCount })}`}
                        </Text>
                      </View>
                      {isDone ? (
                        <Text style={styles.doneLabel}>{t('onboarding.completed')}</Text>
                      ) : (
                        <ChevronRightIcon size={18} color={colors.ink} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* All done CTA */}
              {allDone && (
                <View style={styles.ctaWrap}>
                  <Text style={styles.allDoneText}>{t('onboarding.allDone')}</Text>
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={handleAllDone}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.startBtnText}>{t('onboarding.startPlaying')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}
        </ScreenContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // ── Hero section
  hero: {
    backgroundColor: colors.ink,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingVertical: spacing.xxl,
    overflow: 'hidden',
    ...shadows.large,
  },
  heroInner: {
    zIndex: 1,
  },
  flagMosaic: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  flagThumb: {
    width: 48,
    height: 32,
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: -12,
    borderWidth: 1.5,
    borderColor: colors.whiteAlpha20,
  },
  welcomeText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.lg,
    color: colors.whiteAlpha60,
    marginBottom: spacing.xs,
  },
  wordmark: {
    marginBottom: spacing.md,
  },
  wmLine1: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.gameTitle,
    lineHeight: 44,
    color: colors.white,
    letterSpacing: -0.5,
  },
  wmLine2: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.gameTitle,
    lineHeight: 44,
    color: colors.accentLight,
  },
  tagline: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.whiteAlpha70,
    lineHeight: 24,
  },

  // ── Two-path choice
  choiceWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.accent,
  },
  primaryBtnIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTextWrap: {
    flex: 1,
  },
  primaryBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.lg,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.white,
    marginBottom: 2,
  },
  primaryBtnSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.whiteAlpha60,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.medium,
  },
  secondaryBtnIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.lg,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.ink,
    marginBottom: 2,
  },
  secondaryBtnSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },

  // ── Baseline test list
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  testTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  skipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    paddingVertical: spacing.sm,
  },

  // ── Progress
  progressSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.rule,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },

  // ── Region cards
  regionList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.rule,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  regionCardDone: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  regionCardActive: {
    borderColor: colors.ink,
    ...shadows.small,
  },
  regionLeft: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionNumberActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionNumberTextActive: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.caption,
    color: colors.white,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionContent: {
    flex: 1,
  },
  regionName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginBottom: 2,
  },
  regionNameDone: {
    color: colors.success,
  },
  regionSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    lineHeight: 18,
  },
  doneLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.success,
  },
  // ── CTA
  ctaWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  allDoneText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  startBtn: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + spacing.xxs,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...shadows.accent,
  },
  startBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xl,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white,
  },
});
