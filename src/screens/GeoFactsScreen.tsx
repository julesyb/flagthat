import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fontFamily, fontSize, spacing, borderRadius, typography, buildButtons, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';
import { hapticTap, hapticCorrect, hapticWrong, playWrongSound } from '../utils/feedback';
import { getGeoFacts, generateGeoQuiz, renderGeoFact, getQuizTakeaway, GeoFact, GeoQuizQuestion, FactCategory } from '../data/facts';
import { RootStackParamList } from '../types/navigation';
import FlagImage from '../components/FlagImage';
import { FlagIcon, TrophyIcon, CompassIcon, GlobeIcon, CalendarIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import { useGameControls } from '../hooks/useGameControls';

type Props = NativeStackScreenProps<RootStackParamList, 'GeoFacts'>;

type Tab = 'browse' | 'quiz';
type QuizPhase = 'intro' | 'playing' | 'done';

const GEO_QUIZ_COUNT = 10;

// Category metadata drives both the filter chips and each card's badge, so
// adding a fact category only means extending this list (and the locale keys).
type IconCmp = (props: { size?: number; color: string }) => React.ReactElement;
type CategoryMeta = { id: FactCategory; labelKey: string; color: (c: ThemeColors) => string; Icon: IconCmp };

const CATEGORY_META: CategoryMeta[] = [
  { id: 'flags', labelKey: 'geofacts.catFlags', color: (c) => c.modeRed, Icon: FlagIcon },
  { id: 'records', labelKey: 'geofacts.catRecords', color: (c) => c.goldText, Icon: TrophyIcon },
  { id: 'nature', labelKey: 'geofacts.catNature', color: (c) => c.modeGreen, Icon: CompassIcon },
  { id: 'geography', labelKey: 'geofacts.catGeography', color: (c) => c.modeBlue, Icon: GlobeIcon },
  { id: 'history', labelKey: 'geofacts.catHistory', color: (c) => c.modePurple, Icon: CalendarIcon },
];

const CATEGORY_BY_ID = CATEGORY_META.reduce(
  (acc, m) => { acc[m.id] = m; return acc; },
  {} as Record<FactCategory, CategoryMeta>,
);

const FILTERS: { id: string; labelKey: string }[] = [
  { id: 'all', labelKey: 'common.all' },
  ...CATEGORY_META.map((m) => ({ id: m.id, labelKey: m.labelKey })),
];

export default function GeoFactsScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onNavigate = useNavTabs();

  const [tab, setTab] = useState<Tab>('browse');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <ScreenContainer>
          <Text style={styles.title}>{t('geofacts.title')}</Text>
          <Text style={styles.subtitle}>{t('geofacts.subtitle')}</Text>
          <View style={styles.toggleRow}>
            <ToggleBtn label={t('geofacts.browse')} active={tab === 'browse'} onPress={() => setTab('browse')} colors={colors} />
            <ToggleBtn label={t('geofacts.quiz')} active={tab === 'quiz'} onPress={() => setTab('quiz')} colors={colors} />
          </View>
        </ScreenContainer>
      </View>

      {tab === 'browse' ? <BrowseView colors={colors} /> : <QuizView colors={colors} navigation={navigation} />}

      <BottomNav activeTab="Modes" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

// ─── Toggle button ───────────────────────────────────────────
function ToggleBtn({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleBtnOn]}
      onPress={() => { hapticTap(); onPress(); }}
      activeOpacity={0.8}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.toggleText, active && styles.toggleTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Browse view ─────────────────────────────────────────────
function FactCard({ item, colors }: { item: GeoFact; colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const meta = CATEGORY_BY_ID[item.category];
  const accent = meta.color(colors);
  const Icon = meta.Icon;
  return (
    <View style={[styles.factCard, { borderColor: colors.border }]}>
      {/* Visual anchor: the country flag, or a category-tinted tile with the
          category icon when the fact is not tied to a single country. */}
      {item.flagId ? (
        <View style={styles.factMedia}>
          <FlagImage countryCode={item.flagId} size="small" fill accessibilityLabel={t(meta.labelKey)} />
        </View>
      ) : (
        <View style={[styles.factMedia, styles.factMediaTile, { backgroundColor: `${accent}1A` }]}>
          <Icon size={30} color={accent} />
        </View>
      )}
      <View style={styles.factContent}>
        <View style={styles.factEyebrow}>
          <Icon size={13} color={accent} />
          <Text style={[styles.factEyebrowText, { color: accent }]}>{t(meta.labelKey)}</Text>
        </View>
        <Text style={styles.factText}>{renderGeoFact(item)}</Text>
      </View>
    </View>
  );
}

function BrowseView({ colors }: { colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const allFacts = useMemo(() => getGeoFacts(), []);
  const [filter, setFilter] = useState('all');

  const facts = useMemo(
    () => (filter === 'all' ? allFacts : allFacts.filter((f) => f.category === filter)),
    [allFacts, filter],
  );

  const renderItem = useCallback(
    // Same centered max-width column as the header and filters
    ({ item }: { item: GeoFact }) => (
      <ScreenContainer>
        <FactCard item={item} colors={colors} />
      </ScreenContainer>
    ),
    [colors],
  );

  return (
    <ScreenContainer flex>
      <FlatList
        data={facts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.chipsRow}>
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, active && styles.chipOn]}
                    onPress={() => { hapticTap(); setFilter(f.id); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(f.labelKey)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextOn]}>{t(f.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.countLabel}>{t('geofacts.factCount', { count: facts.length })}</Text>
          </>
        }
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
      />
    </ScreenContainer>
  );
}

// ─── Quiz view ───────────────────────────────────────────────
function QuizView({ colors, navigation }: { colors: ThemeColors; navigation: Props['navigation'] }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [phase, setPhase] = useState<QuizPhase>('intro');
  const [questions, setQuestions] = useState<GeoQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const start = () => {
    hapticTap();
    setQuestions(generateGeoQuiz(GEO_QUIZ_COUNT));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setPhase('playing');
  };

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const q = questions[index];
    if (i === q.answerIndex) {
      hapticCorrect();
      setScore((s) => s + 1);
    } else {
      hapticWrong();
      playWrongSound();
    }
  };

  const next = () => {
    hapticTap();
    if (index + 1 >= questions.length) {
      setPhase('done');
    } else {
      setIndex((n) => n + 1);
      setPicked(null);
    }
  };

  // Keys pick an answer; Enter starts the quiz, moves on, or plays again. Swipe left moves on.
  const playing = phase === 'playing';
  const quizSwipe = useGameControls({
    optionCount: playing ? questions[index]?.options.length ?? 0 : 0,
    canPick: playing && picked === null,
    onPick: pick,
    canContinue: !playing || picked !== null,
    onContinue: playing ? next : start,
    canSwipe: playing && picked !== null,
  });

  if (phase === 'intro') {
    return (
      <ScrollView contentContainerStyle={styles.centerContent}>
        <ScreenContainer>
          <View style={styles.introCard}>
            <Text style={styles.introText}>{t('geofacts.quizIntro', { count: GEO_QUIZ_COUNT })}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={start} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('geofacts.startQuiz')}>
              <Text style={styles.primaryBtnText}>{t('geofacts.startQuiz')}</Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </ScrollView>
    );
  }

  if (phase === 'done') {
    return (
      <ScrollView contentContainerStyle={styles.centerContent}>
        <ScreenContainer>
          <View style={styles.introCard}>
            <Text style={styles.doneTitle}>{t('geofacts.quizComplete')}</Text>
            <Text style={styles.doneScore}>{t('geofacts.scoreLine', { correct: score, total: questions.length })}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={start} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('geofacts.playAgain')}>
              <Text style={styles.primaryBtnText}>{t('geofacts.playAgain')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { hapticTap(); navigation.goBack(); }} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('common.home')}>
              <Text style={styles.secondaryBtnText}>{t('common.home')}</Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </ScrollView>
    );
  }

  const q = questions[index];
  const answered = picked !== null;
  const takeaway = answered ? getQuizTakeaway(q.id) : null;

  return (
    // Swipe handlers sit on a plain View: ScrollView replaces some responder props with its own
    <View style={styles.quizWrap} {...quizSwipe}>
    <ScrollView contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
      <ScreenContainer>
        <Text style={styles.progress}>{t('geofacts.questionOf', { current: index + 1, total: questions.length })}</Text>

        {q.flagId && (
          <View style={styles.quizFlagWrap}>
            <FlagImage countryCode={q.flagId} size="medium" fill style={styles.quizFlag} />
          </View>
        )}

        <Text style={styles.prompt}>{q.prompt}</Text>

        <View style={styles.optsGrid}>
          <View style={styles.optsRow}>{q.options.slice(0, 2).map((opt, i) => renderOpt(opt, i))}</View>
          <View style={styles.optsRow}>{q.options.slice(2, 4).map((opt, i) => renderOpt(opt, i + 2))}</View>
        </View>

        {takeaway && (
          <View style={styles.takeaway}>
            <Text style={styles.takeawayText}>{takeaway}</Text>
          </View>
        )}

        {answered && (
          <TouchableOpacity style={styles.primaryBtn} onPress={next} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={index + 1 >= questions.length ? t('geofacts.seeResult') : t('geofacts.next')}>
            <Text style={styles.primaryBtnText}>{index + 1 >= questions.length ? t('geofacts.seeResult') : t('geofacts.next')}</Text>
          </TouchableOpacity>
        )}
      </ScreenContainer>
    </ScrollView>
    </View>
  );

  function renderOpt(label: string, i: number) {
    const isCorrect = i === q.answerIndex;
    const isSelected = picked === i;
    const showCorrect = answered && isCorrect;
    const showWrong = isSelected && !isCorrect;
    const flagCode = q.optionFlags?.[i];
    return (
      <View key={i} style={styles.optWrap}>
        <TouchableOpacity
          style={[styles.optBtn, flagCode && styles.optBtnFlag, showCorrect && styles.optCorrect, showWrong && styles.optWrong]}
          onPress={() => pick(i)}
          activeOpacity={0.8}
          disabled={answered}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: answered, selected: isSelected }}
        >
          {flagCode ? (
            <View style={styles.optFlagContent}>
              <View style={styles.optFlagWrap}>
                <FlagImage countryCode={flagCode} size="small" fill accessibilityLabel={label} />
              </View>
              {answered && (
                <Text style={[styles.optFlagLabel, showCorrect && styles.optTextCorrect, showWrong && styles.optTextWrong]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {label}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.optText, showCorrect && styles.optTextCorrect, showWrong && styles.optTextWrong]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
              {label}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
}

const createStyles = (colors: ThemeColors) => {
  const btn = buildButtons(colors);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    title: {
      ...typography.title,
      color: colors.ink,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textTertiary,
      marginTop: spacing.xxs,
      marginBottom: spacing.md,
    },

    // Toggle
    toggleRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: spacing.sm + spacing.xs,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    toggleBtnOn: {
      backgroundColor: colors.goldBright,
      borderColor: colors.goldBright,
    },
    toggleText: {
      ...typography.label,
      color: colors.textTertiary,
    },
    toggleTextOn: {
      color: colors.playText,
    },

    // Browse list
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    chip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm + spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipOn: {
      backgroundColor: colors.goldBright,
      borderColor: colors.goldBright,
    },
    chipText: {
      ...typography.microMedium,
      color: colors.textTertiary,
    },
    chipTextOn: {
      color: colors.playText,
    },
    countLabel: {
      ...typography.micro,
      color: colors.textTertiary,
      marginBottom: spacing.sm,
    },
    factCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    factMedia: {
      width: 104,
      aspectRatio: 3 / 2,
      borderRadius: borderRadius.sm,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.ruleDark,
    },
    factMediaTile: {
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: 'transparent',
    },
    factContent: {
      flex: 1,
      gap: spacing.xs,
      paddingTop: spacing.xxs,
    },
    factEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    factEyebrowText: {
      ...typography.eyebrow,
    },
    factText: {
      fontSize: fontSize.body,
      fontFamily: fontFamily.body,
      color: colors.ink,
      lineHeight: 23,
    },

    // Quiz
    centerContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.md,
    },
    quizWrap: {
      flex: 1,
    },
    quizContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    introCard: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.rule,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      alignItems: 'center',
    },
    introText: {
      ...typography.body,
      color: colors.ink,
      textAlign: 'center',
    },
    progress: {
      ...typography.eyebrow,
      color: colors.textTertiary,
      marginBottom: spacing.sm,
    },
    quizFlagWrap: {
      alignSelf: 'center',
      width: 140,
      aspectRatio: 3 / 2,
      borderRadius: borderRadius.sm,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    quizFlag: {
      borderRadius: borderRadius.sm,
    },
    prompt: {
      ...typography.bodyBold,
      fontSize: fontSize.lg,
      color: colors.ink,
      marginBottom: spacing.md,
    },
    optsGrid: {
      gap: spacing.sm,
    },
    optsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    optWrap: {
      flex: 1,
    },
    optBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      minHeight: 56,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optBtnFlag: {
      padding: spacing.xs,
    },
    optFlagContent: {
      width: '100%',
      alignItems: 'center',
      gap: spacing.xs,
    },
    optFlagWrap: {
      width: '100%',
      aspectRatio: 3 / 2,
      borderRadius: borderRadius.xs,
      overflow: 'hidden',
    },
    optFlagLabel: {
      ...typography.microMedium,
      color: colors.ink,
      textAlign: 'center',
    },
    takeaway: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    takeawayText: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    optCorrect: {
      backgroundColor: colors.successBg,
      borderColor: colors.success,
    },
    optWrong: {
      backgroundColor: colors.errorBg,
      borderColor: colors.error,
    },
    optText: {
      ...typography.label,
      color: colors.ink,
      textAlign: 'center',
    },
    optTextCorrect: {
      color: colors.success,
    },
    optTextWrong: {
      color: colors.error,
    },

    doneTitle: {
      ...typography.heading,
      color: colors.ink,
    },
    doneScore: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // Buttons
    primaryBtn: {
      ...btn.primary,
      alignSelf: 'stretch',
      marginTop: spacing.md,
    },
    primaryBtnText: {
      ...btn.primaryText,
      textAlign: 'center',
    },
    secondaryBtn: {
      ...btn.secondary,
      alignSelf: 'stretch',
    },
    secondaryBtnText: {
      ...btn.secondaryText,
      textAlign: 'center',
    },
  });
};
