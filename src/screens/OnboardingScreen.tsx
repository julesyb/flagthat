import React, { useEffect, useRef, useMemo } from 'react';
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
import { fontFamily, fontSize, spacing, borderRadius, shadows, typography, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { skipOnboarding, saveSkillLevel, SkillLevel } from '../utils/storage';
import { hapticTap } from '../utils/feedback';
import { FlagIcon, GlobeIcon, TrophyIcon, CompassIcon, ChevronRightIcon } from '../components/Icons';
import FlagImage from '../components/FlagImage';
import { RootStackParamList } from '../types/navigation';
import { t } from '../utils/i18n';
import ScreenContainer from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

// Pick 4 recognizable flags for the hero mosaic
const HERO_FLAGS = ['jp', 'br', 'gb', 'za'];

interface SkillOption {
  level: SkillLevel;
  titleKey: string;
  descKey: string;
  icon: (size: number, color: string) => React.ReactNode;
  colorKey: 'diffEasy' | 'diffMedium' | 'diffHard' | 'modePurple';
  bgKey: 'diffEasyBg' | 'diffMediumBg' | 'diffHardBg' | 'expertBg';
  borderKey: 'diffEasyBorder' | 'diffMediumBorder' | 'diffHardBorder' | 'expertBorder';
}

const SKILL_OPTIONS: SkillOption[] = [
  {
    level: 'beginner',
    titleKey: 'onboarding.skillBeginner',
    descKey: 'onboarding.skillBeginnerDesc',
    icon: (size, color) => <FlagIcon size={size} color={color} />,
    colorKey: 'diffEasy',
    bgKey: 'diffEasyBg',
    borderKey: 'diffEasyBorder',
  },
  {
    level: 'intermediate',
    titleKey: 'onboarding.skillIntermediate',
    descKey: 'onboarding.skillIntermediateDesc',
    icon: (size, color) => <GlobeIcon size={size} color={color} />,
    colorKey: 'diffMedium',
    bgKey: 'diffMediumBg',
    borderKey: 'diffMediumBorder',
  },
  {
    level: 'advanced',
    titleKey: 'onboarding.skillAdvanced',
    descKey: 'onboarding.skillAdvancedDesc',
    icon: (size, color) => <TrophyIcon size={size} color={color} />,
    colorKey: 'diffHard',
    bgKey: 'diffHardBg',
    borderKey: 'diffHardBorder',
  },
  {
    level: 'expert',
    titleKey: 'onboarding.skillExpert',
    descKey: 'onboarding.skillExpertDesc',
    icon: (size, color) => <CompassIcon size={size} color={color} />,
    colorKey: 'modePurple',
    bgKey: 'expertBg',
    borderKey: 'expertBorder',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Animations
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const promptFade = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(SKILL_OPTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Phase 1: Hero slides in
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(heroSlide, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    // Phase 2: Prompt text fades in
    setTimeout(() => {
      Animated.timing(promptFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 350);

    // Phase 3: Skill cards stagger in
    setTimeout(() => {
      Animated.stagger(
        100,
        cardAnims.map((a) =>
          Animated.spring(a, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
        ),
      ).start();
    }, 500);
  }, []);

  const handleSkillSelect = async (level: SkillLevel) => {
    hapticTap();
    await saveSkillLevel(level);
    await skipOnboarding();
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
          {/* Hero section */}
          <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <View>
              <Text style={styles.welcomeText}>{t('onboarding.welcome')}</Text>
              <View style={styles.wordmark}>
                <Text style={styles.wmFlag}>Flag</Text>
                <Text style={styles.wmThat}>That</Text>
              </View>
              <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
            </View>

            {/* Flag mosaic */}
            <View style={styles.flagMosaic}>
              {HERO_FLAGS.map((code, i) => (
                <View key={code} style={[styles.flagThumb, { transform: [{ rotate: `${-8 + i * 5}deg` }, { translateX: i * 6 }] }]}>
                  <FlagImage countryCode={code} size="small" />
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Prompt */}
          <Animated.View style={[styles.promptWrap, { opacity: promptFade }]}>
            <Text style={styles.promptText}>{t('onboarding.tellUsAboutYou')}</Text>
          </Animated.View>

          {/* Skill level cards */}
          <View style={styles.cardList}>
            {SKILL_OPTIONS.map((option, index) => {
              const accentColor = (colors as Record<string, string>)[option.colorKey];
              const bgColor = (colors as Record<string, string>)[option.bgKey] || 'transparent';
              const borderColor = (colors as Record<string, string>)[option.borderKey] || accentColor;

              return (
                <Animated.View
                  key={option.level}
                  style={{
                    opacity: cardAnims[index],
                    transform: [{
                      translateY: cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.skillCard, { backgroundColor: bgColor, borderColor }]}
                    onPress={() => handleSkillSelect(option.level)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t(option.titleKey)}
                    accessibilityHint={t(option.descKey)}
                  >
                    <View style={[styles.skillIcon, { backgroundColor: accentColor }]}>
                      {option.icon(18, colors.white)}
                    </View>
                    <View style={styles.skillTextWrap}>
                      <Text style={[styles.skillTitle, { color: accentColor }]}>
                        {t(option.titleKey)}
                      </Text>
                      <Text style={styles.skillDesc}>{t(option.descKey)}</Text>
                    </View>
                    <ChevronRightIcon size={18} color={accentColor} />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScreenContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingVertical: spacing.xxl,
    overflow: 'hidden',
    ...shadows.large,
  },
  flagMosaic: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: spacing.md,
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
    ...typography.body,
    color: colors.whiteAlpha60,
    marginBottom: spacing.xs,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  wmFlag: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
    lineHeight: 44,
    color: colors.text,
    letterSpacing: -0.5,
  },
  wmThat: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.display,
    lineHeight: 44,
    color: colors.accentLight,
  },
  tagline: {
    ...typography.label,
    color: colors.whiteAlpha70,
    lineHeight: 24,
  },

  // ── Prompt
  promptWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  promptText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },

  // ── Skill cards
  cardList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    ...shadows.small,
  },
  skillIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillTextWrap: {
    flex: 1,
  },
  skillTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.body,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  skillDesc: {
    ...typography.caption,
    color: colors.textTertiary,
    lineHeight: 18,
  },
});
