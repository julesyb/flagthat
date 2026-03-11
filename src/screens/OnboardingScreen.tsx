import React, { useCallback, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontFamily, spacing, borderRadius } from '../utils/theme';
import { getBaselineData, BaselineData, skipOnboarding } from '../utils/storage';
import { getCategoryCount } from '../data';
import { hapticTap } from '../utils/feedback';
import { CheckIcon, ChevronRightIcon } from '../components/Icons';
import { RootStackParamList } from '../types/navigation';
import { BaselineRegionId, CategoryId } from '../types';
import { t } from '../utils/i18n';

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

  useFocusEffect(
    useCallback(() => {
      getBaselineData().then(setBaseline);
    }, []),
  );

  const completedCount = baseline
    ? REGIONS.filter((r) => baseline.regions[r.id]).length
    : 0;
  const allDone = completedCount === REGIONS.length;

  const handleRegionPress = (region: BaselineRegionId) => {
    hapticTap();
    navigation.navigate('Game', {
      config: {
        mode: 'baseline',
        category: region as CategoryId,
        questionCount: 10,
        displayMode: 'flag',
      },
    });
  };

  const handleSkip = async () => {
    hapticTap();
    await skipOnboarding();
    navigation.replace('Home');
  };

  const handleStartPlaying = () => {
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
        <View style={s.desktopWrapper}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.wordmark}>
              <Text style={s.wmLine1}>Flag</Text>
              <Text style={s.wmLine2}>That</Text>
            </View>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.6}>
              <Text style={s.skipText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.subtitle}>{t('onboarding.subtitle')}</Text>

          {/* Region cards */}
          <View style={s.regionList}>
            {REGIONS.map((region) => {
              const result = baseline?.regions[region.id];
              const isDone = !!result;
              const flagCount = getCategoryCount(region.categoryId);

              return (
                <TouchableOpacity
                  key={region.id}
                  style={[s.regionCard, isDone && s.regionCardDone]}
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
                      <View style={s.regionDot} />
                    )}
                  </View>
                  <View style={s.regionContent}>
                    <Text style={[s.regionName, isDone && s.regionNameDone]}>
                      {t(`categories.${region.id}`)}
                    </Text>
                    <Text style={s.regionSub}>
                      {isDone
                        ? `${result!.correct}/${result!.total} - ${result!.accuracy}%`
                        : `${t('onboarding.flagCount', { count: flagCount })} - ${t('onboarding.regionTest')}`}
                    </Text>
                  </View>
                  {isDone ? (
                    <Text style={s.doneLabel}>{t('onboarding.completed')}</Text>
                  ) : (
                    <ChevronRightIcon size={18} color={colors.ink} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Progress / CTA */}
          {allDone ? (
            <View style={s.ctaWrap}>
              <Text style={s.allDoneText}>{t('onboarding.allDone')}</Text>
              <TouchableOpacity
                style={s.startBtn}
                onPress={handleStartPlaying}
                activeOpacity={0.85}
              >
                <Text style={s.startBtnText}>{t('onboarding.startPlaying')}</Text>
              </TouchableOpacity>
            </View>
          ) : completedCount > 0 ? (
            <View style={s.progressWrap}>
              <View style={s.progressBar}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${(completedCount / REGIONS.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={s.progressText}>
                {completedCount}/{REGIONS.length}
              </Text>
            </View>
          ) : null}
        </View>
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
    alignItems: 'center',
  },
  desktopWrapper: {
    width: '100%',
    maxWidth: 600,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  wordmark: {},
  wmLine1: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 36,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  wmLine2: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 34,
    lineHeight: 36,
    color: colors.accent,
  },
  skipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.textTertiary,
    paddingVertical: spacing.sm,
  },

  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 18,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  // Region cards
  regionList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  regionCardDone: {
    borderColor: colors.rule,
    opacity: 0.7,
  },
  regionLeft: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ink,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionContent: {
    flex: 1,
  },
  regionName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 2,
  },
  regionNameDone: {
    color: colors.textTertiary,
  },
  regionSub: {
    fontFamily: fontFamily.body,
    fontSize: 14,
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

  // Progress
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.rule,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 14,
    color: colors.textTertiary,
  },

  // CTA
  ctaWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  allDoneText: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    color: colors.textSecondary,
  },
  startBtn: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + spacing.xxs,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  startBtnText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 19,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.white,
  },
});
