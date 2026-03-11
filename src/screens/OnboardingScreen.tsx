import React, { useCallback, useState, useRef, useEffect } from 'react';
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
import { getCategoryCount } from '../data';
import { hapticTap } from '../utils/feedback';
import { CheckIcon, ChevronRightIcon, PlayIcon, BarChartIcon, GlobeIcon } from '../components/Icons';
import { RootStackParamList } from '../types/navigation';
import { BaselineRegionId, CategoryId } from '../types';
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

  useEffect(() => {
    // Staggered entrance animation
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(heroSlide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(btnSlide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 300);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getBaselineData().then((data) => {
        setBaseline(data);
        // If user has started baseline tests, go straight to test view
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
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
          {/* Hero section */}
          <Animated.View style={[s.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <View style={s.heroInner}>
              <Text style={s.welcomeText}>{t('onboarding.welcome')}</Text>
              <View style={s.wordmark}>
                <Text style={s.wmLine1}>Flag</Text>
                <Text style={s.wmLine2}>That</Text>
              </View>
              <Text style={s.tagline}>{t('onboarding.tagline')}</Text>
            </View>

            {/* Globe icon decoration */}
            <View style={s.heroIconWrap}>
              <GlobeIcon size={48} color={colors.whiteAlpha20} />
            </View>
          </Animated.View>

          {!showTests ? (
            /* ── Two-path choice ── */
            <Animated.View style={[s.choiceWrap, { opacity: btnFade, transform: [{ translateY: btnSlide }] }]}>
              {/* Start Playing - primary CTA */}
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={handleStartPlaying}
                activeOpacity={0.85}
              >
                <View style={s.primaryBtnIcon}>
                  <PlayIcon size={16} color={colors.white} />
                </View>
                <View style={s.btnTextWrap}>
                  <Text style={s.primaryBtnText}>{t('onboarding.startPlayingNow')}</Text>
                  <Text style={s.primaryBtnSub}>{t('onboarding.startPlayingDesc')}</Text>
                </View>
                <ChevronRightIcon size={18} color={colors.white} />
              </TouchableOpacity>

              {/* Test Your Knowledge - secondary CTA */}
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={handleTestKnowledge}
                activeOpacity={0.85}
              >
                <View style={s.secondaryBtnIcon}>
                  <BarChartIcon size={16} color={colors.ink} />
                </View>
                <View style={s.btnTextWrap}>
                  <Text style={s.secondaryBtnText}>{t('onboarding.testKnowledge')}</Text>
                  <Text style={s.secondaryBtnSub}>{t('onboarding.testKnowledgeDesc')}</Text>
                </View>
                <ChevronRightIcon size={18} color={colors.ink} />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* ── Baseline test list ── */
            <Animated.View style={{ opacity: testsFade, transform: [{ translateY: testsSlide }] }}>
              <View style={s.testHeader}>
                <Text style={s.testTitle}>{t('onboarding.subtitle')}</Text>
                {!allDone && (
                  <TouchableOpacity onPress={handleStartPlaying} activeOpacity={0.6}>
                    <Text style={s.skipText}>{t('onboarding.skip')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress bar */}
              <View style={s.progressSection}>
                <View style={s.progressBar}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${(completedCount / REGIONS.length) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={s.progressText}>
                  {t('onboarding.regionsComplete', { count: completedCount, total: REGIONS.length })}
                </Text>
              </View>

              {/* Region cards */}
              <View style={s.regionList}>
                {REGIONS.map((region, index) => {
                  const result = baseline?.regions[region.id];
                  const isDone = !!result;
                  const flagCount = getCategoryCount(region.categoryId);
                  const isNext = !isDone && !REGIONS.slice(0, index).some((r) => !baseline?.regions[r.id]);

                  return (
                    <TouchableOpacity
                      key={region.id}
                      style={[
                        s.regionCard,
                        isDone && s.regionCardDone,
                        isNext && s.regionCardNext,
                      ]}
                      activeOpacity={isDone ? 1 : 0.85}
                      onPress={() => !isDone && handleRegionPress(region.id)}
                      disabled={isDone}
                    >
                      <View style={s.regionLeft}>
                        {isDone ? (
                          <View style={s.checkCircle}>
                            <CheckIcon size={16} color={colors.white} />
                          </View>
                        ) : (
                          <View style={[s.regionNumber, isNext && s.regionNumberNext]}>
                            <Text style={[s.regionNumberText, isNext && s.regionNumberTextNext]}>
                              {index + 1}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={s.regionContent}>
                        <Text style={[s.regionName, isDone && s.regionNameDone]}>
                          {t(`categories.${region.id}`)}
                        </Text>
                        <Text style={s.regionSub}>
                          {isDone
                            ? `${result!.correct}/${result!.total} correct, ${result!.accuracy}%`
                            : `${t('onboarding.flagCount', { count: flagCount })}`}
                        </Text>
                      </View>
                      {isDone ? (
                        <Text style={s.doneLabel}>{t('onboarding.completed')}</Text>
                      ) : isNext ? (
                        <View style={s.startTag}>
                          <Text style={s.startTagText}>{t('common.play')}</Text>
                        </View>
                      ) : (
                        <ChevronRightIcon size={18} color={colors.rule} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* All done CTA */}
              {allDone && (
                <View style={s.ctaWrap}>
                  <Text style={s.allDoneText}>{t('onboarding.allDone')}</Text>
                  <TouchableOpacity
                    style={s.startBtn}
                    onPress={handleAllDone}
                    activeOpacity={0.85}
                  >
                    <Text style={s.startBtnText}>{t('onboarding.startPlaying')}</Text>
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

const s = StyleSheet.create({
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
  heroIconWrap: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    opacity: 0.5,
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
    fontSize: 42,
    lineHeight: 44,
    color: colors.white,
    letterSpacing: -0.5,
  },
  wmLine2: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 42,
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
    ...shadows.accentShadow,
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
  regionCardNext: {
    borderColor: colors.ink,
    ...shadows.small,
  },
  regionLeft: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionNumberNext: {
    backgroundColor: colors.ink,
  },
  regionNumberText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  regionNumberTextNext: {
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
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.success,
  },
  startTag: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  startTagText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.white,
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
    ...shadows.accentShadow,
  },
  startBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xl,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white,
  },
});
