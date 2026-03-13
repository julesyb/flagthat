import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Keyboard,
  Alert,
  Platform,
  Animated,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spacing, fontFamily, fontSize, buildButtons, borderRadius, typography, ThemeColors, APP_URL } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { decodeChallenge, buildChallengeQuestions, getScreenForMode, ChallengeData, ChallengeScreenName, generateShortCode, encodeResponse } from '../utils/challengeCode';
import { hapticTap, hapticWrong, hapticCorrect } from '../utils/feedback';
import { modeLabelKey } from '../utils/gameEngine';
import ScreenContainer from '../components/ScreenContainer';
import BottomNav from '../components/BottomNav';
import { useNavTabs } from '../hooks/useNavTabs';
import { t } from '../utils/i18n';
import { getChallengeName, saveChallengeName, getChallengeHistory, ChallengeHistoryEntry } from '../utils/storage';
import { LinkIcon, PlayIcon, CheckIcon } from '../components/Icons';
import { GameMode } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinChallenge'>;

export default function JoinChallengeScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onNavigate = useNavTabs();
  const initialCode = route.params?.code ?? '';
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [previousAttempt, setPreviousAttempt] = useState<ChallengeHistoryEntry | null>(null);

  // Keep code in sync with route params (handles deep link re-navigation)
  useEffect(() => {
    const newCode = route.params?.code ?? '';
    if (newCode && newCode !== code) {
      setCode(newCode);
    }
  }, [route.params?.code]);

  // Animations
  const cardSlide = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    getChallengeName().then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  const decoded = useMemo(() => {
    const trimmed = code.trim();
    if (trimmed.length === 0) return null;
    return decodeChallenge(trimmed);
  }, [code]);

  const preview: ChallengeData | null = decoded?.status === 'ok' ? decoded.data : null;

  // Check if user has already played this challenge
  useEffect(() => {
    if (!preview) {
      setPreviousAttempt(null);
      return;
    }
    const shortCode = generateShortCode(preview);
    getChallengeHistory().then((history) => {
      const existing = history.find(
        (h) => h.shortCode === shortCode && h.direction === 'received',
      );
      setPreviousAttempt(existing ?? null);
    });
  }, [preview]);

  const canPlay = decoded?.status === 'ok' && name.trim().length > 0 && !previousAttempt;

  // Animate challenge card in when preview becomes available
  useEffect(() => {
    if (preview) {
      hapticCorrect();
      cardSlide.setValue(20);
      cardOpacity.setValue(0);
      ctaScale.setValue(0.95);
      Animated.parallel([
        Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(400),
          Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        ]),
      ]).start();
    }
  }, [preview]);

  const showError = (msg: string) => {
    hapticWrong();
    if (Platform.OS === 'web') {
      alert(msg);
    } else {
      Alert.alert(t('challenge.invalidCodeTitle'), msg);
    }
  };

  const handlePlay = () => {
    Keyboard.dismiss();
    hapticTap();

    const result = decodeChallenge(code.trim());
    if (result.status === 'unsupported') {
      showError(t('challenge.unsupportedCode'));
      return;
    }
    if (result.status === 'invalid') {
      showError(t('challenge.invalidCode'));
      return;
    }

    const challenge = result.data;
    const questions = buildChallengeQuestions(challenge.flagIds, challenge.mode, challenge.difficulty);
    if (!questions) {
      showError(t('challenge.invalidCode'));
      return;
    }

    saveChallengeName(name.trim());

    const screen: ChallengeScreenName = getScreenForMode(challenge.mode);
    const gameParams = {
      config: {
        mode: challenge.mode,
        category: 'all' as const,
        questionCount: challenge.flagIds.length,
        timeLimit: challenge.timeLimit,
        ...(challenge.difficulty && { difficulty: challenge.difficulty }),
      },
      challenge,
      playerName: name.trim(),
    };

    (navigation.replace as (screen: string, params: typeof gameParams) => void)(screen, gameParams);
  };

  const handleResendResults = async () => {
    if (!preview || !previousAttempt) return;
    hapticTap();
    const responseCode = encodeResponse({
      recipientName: previousAttempt.myName,
      shortCode: previousAttempt.shortCode,
      recipientScore: previousAttempt.myScore,
      totalFlags: previousAttempt.totalFlags,
      resultDetails: previousAttempt.myResults,
    });
    const link = `${APP_URL}/r/${responseCode}`;
    const message = t('challenge.responseShareCard', {
      name: previousAttempt.myName,
      correct: String(previousAttempt.myScore),
      total: String(previousAttempt.totalFlags),
      link,
    });
    try {
      await Share.share({ message });
    } catch { /* share cancelled */ }
  };

  const hostScore = preview
    ? preview.hostResults.filter((r) => r.correct).length
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
          {/* ── EMPTY STATE: No code entered ── */}
          {!preview && (
            <View style={styles.emptyState}>
              <View style={styles.iconCircle}>
                <LinkIcon size={28} color={colors.goldBright} />
              </View>
              <Text style={styles.title}>{t('challenge.joinTitle')}</Text>
              <Text style={styles.subtitle}>{t('challenge.joinSubtitle')}</Text>

              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={setCode}
                placeholder={t('challenge.codePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                multiline={false}
                accessibilityLabel={t('challenge.codePlaceholder')}
              />

              {code.trim().length > 0 && decoded?.status === 'invalid' && (
                <Text style={styles.error}>{t('challenge.invalidCode')}</Text>
              )}
              {decoded?.status === 'unsupported' && (
                <Text style={styles.error}>{t('challenge.unsupportedCode')}</Text>
              )}

              <Text style={styles.hint}>{t('challenge.codeHint')}</Text>
            </View>
          )}

          {/* ── CHALLENGE CARD: Code is valid ── */}
          {preview && (
            <Animated.View style={[
              styles.challengeCard,
              { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
            ]}>
              {/* Eyebrow */}
              <Text style={styles.challengeEyebrow}>{t('challenge.headToHead').toUpperCase()}</Text>

              {/* Opponent score hero */}
              <View style={styles.opponentHero}>
                <Text style={styles.opponentName}>{preview.hostName}</Text>
                <Text style={styles.opponentScore}>{hostScore}/{preview.flagIds.length}</Text>
              </View>

              {/* Divider with "vs" */}
              <View style={styles.vsDivider}>
                <View style={styles.vsLine} />
                <Text style={styles.vsText}>{t('common.vs').toUpperCase()}</Text>
                <View style={styles.vsLine} />
              </View>

              {/* Challenge details */}
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{t(modeLabelKey(preview.mode))}</Text>
                  <Text style={styles.detailLabel}>{t('challenge.previewMode')}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{preview.flagIds.length}</Text>
                  <Text style={styles.detailLabel}>{t('common.flags')}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{preview.timeLimit}s</Text>
                  <Text style={styles.detailLabel}>{t('common.perFlag')}</Text>
                </View>
              </View>

              {/* Host result dots */}
              <View style={styles.dotRow}>
                {preview.hostResults.map((r, i) => (
                  <View
                    key={i}
                    style={[styles.dot, r.correct ? styles.dotCorrect : styles.dotWrong]}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── ALREADY PLAYED ── */}
          {preview && previousAttempt && (
            <Animated.View style={{ opacity: cardOpacity }}>
              <View style={styles.alreadyPlayedCard}>
                <View style={styles.alreadyPlayedHeader}>
                  <CheckIcon size={18} color={colors.success} />
                  <Text style={styles.alreadyPlayedTitle}>{t('challenge.alreadyPlayed')}</Text>
                </View>
                <Text style={styles.alreadyPlayedScore}>
                  {t('challenge.yourPreviousScore', {
                    correct: previousAttempt.myScore,
                    total: previousAttempt.totalFlags,
                  })}
                </Text>
                {previousAttempt.myResults && (
                  <View style={styles.dotRow}>
                    {previousAttempt.myResults.map((ok, i) => (
                      <View
                        key={i}
                        style={[styles.dot, ok ? styles.dotCorrect : styles.dotWrong]}
                      />
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendResults}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('challenge.sendResultsBack')}
                >
                  <LinkIcon size={14} color={colors.gold} />
                  <Text style={styles.resendButtonText}>{t('challenge.sendResultsBack')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ── NAME INPUT (only when not already played) ── */}
          {preview && !previousAttempt && (
            <Animated.View style={{ opacity: cardOpacity }}>
              <Text style={styles.nameLabel}>{t('challenge.enterName')}</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={t('challenge.namePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={8}
                autoFocus={!!initialCode}
                returnKeyType="done"
                onSubmitEditing={canPlay ? handlePlay : undefined}
                accessibilityLabel={t('challenge.namePlaceholder')}
              />
            </Animated.View>
          )}

          {/* ── PLAY CTA (only when not already played) ── */}
          {preview && !previousAttempt && (
            <Animated.View style={{ opacity: cardOpacity, transform: [{ scale: ctaScale }] }}>
              <TouchableOpacity
                style={[styles.playButton, !canPlay && styles.playButtonDisabled]}
                onPress={handlePlay}
                disabled={!canPlay}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.acceptChallenge', { name: preview.hostName })}
                accessibilityState={{ disabled: !canPlay }}
              >
                <PlayIcon size={16} color={colors.playText} />
                <Text style={styles.playButtonText}>{t('challenge.playName', { name: preview.hostName })}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Modes" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => {
  const btn = buildButtons(colors);
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },

  // ── Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.goldBright + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  codeInput: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  error: {
    ...typography.micro,
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  hint: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // ── Challenge card
  challengeCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.goldBright + '40',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  challengeEyebrow: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.goldBright,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  opponentHero: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  opponentName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  opponentScore: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.hero,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 80,
  },
  // ── VS divider
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  vsText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },

  // ── Challenge details
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: 2,
  },
  detailLabel: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  detailDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // ── Dot row (host results preview)
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCorrect: {
    backgroundColor: colors.success,
  },
  dotWrong: {
    backgroundColor: colors.error,
  },

  // ── Name input
  nameLabel: {
    ...typography.microMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // ── Already played
  alreadyPlayedCard: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  alreadyPlayedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alreadyPlayedTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  alreadyPlayedScore: {
    ...typography.body,
    color: colors.ink,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gold,
    marginTop: spacing.xs,
  },
  resendButtonText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.gold,
  },

  // ── Play button
  playButton: {
    ...btn.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  playButtonDisabled: {
    backgroundColor: colors.textTertiary,
    shadowColor: colors.textTertiary,
  },
  playButtonText: {
    ...btn.primaryText,
  },
}); };
