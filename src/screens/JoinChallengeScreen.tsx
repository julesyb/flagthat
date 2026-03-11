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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, buttons, borderRadius } from '../utils/theme';
import { RootStackParamList } from '../types/navigation';
import { decodeChallenge, buildChallengeQuestions, getScreenForMode, ChallengeData } from '../utils/challengeCode';
import { hapticTap, hapticWrong } from '../utils/feedback';
import { UsersIcon, CheckIcon, CrossIcon } from '../components/Icons';
import ScreenContainer from '../components/ScreenContainer';
import BottomNav from '../components/BottomNav';
import { useNavTabs } from '../hooks/useNavTabs';
import { t } from '../utils/i18n';
import { getChallengeName, saveChallengeName } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinChallenge'>;

export default function JoinChallengeScreen({ navigation }: Props) {
  const onNavigate = useNavTabs();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [debouncedCode, setDebouncedCode] = useState('');
  const mountedRef = useRef(true);

  // Track mount state to prevent setState after unmount
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Load saved name on mount
  useEffect(() => {
    getChallengeName().then((saved) => {
      if (saved && mountedRef.current) setName(saved);
    });
  }, []);

  // Debounce code changes (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) setDebouncedCode(code);
    }, 300);
    return () => clearTimeout(timer);
  }, [code]);

  // Decode challenge from debounced code for live preview
  const decoded = useMemo(() => {
    const trimmed = debouncedCode.trim();
    if (trimmed.length === 0) return null;
    return decodeChallenge(trimmed);
  }, [debouncedCode]);

  const preview: ChallengeData | null = decoded && decoded !== 'unsupported' ? decoded : null;
  const isUnsupported = decoded === 'unsupported';

  const canPlay = code.trim().length > 0 && name.trim().length > 0;

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

    const challenge = decodeChallenge(code.trim());
    if (challenge === 'unsupported') {
      showError(t('challenge.unsupportedCode'));
      return;
    }
    if (!challenge) {
      showError(t('challenge.invalidCode'));
      return;
    }

    const questions = buildChallengeQuestions(challenge.flagIds, challenge.mode);
    if (!questions) {
      showError(t('challenge.invalidCode'));
      return;
    }

    // Save name for next time
    saveChallengeName(name.trim());

    const screen = getScreenForMode(challenge.mode) as keyof RootStackParamList;
    const params = {
      config: {
        mode: challenge.mode,
        category: 'all' as const,
        questionCount: challenge.flagIds.length,
        timeLimit: challenge.timeLimit,
      },
      challenge,
      playerName: name.trim(),
    };

    navigation.replace(screen as 'Game', params);
  };

  const modeLabel = preview ? t(`modes.${preview.mode}`) : '';
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
          <View style={styles.iconWrap}>
            <UsersIcon size={28} color={colors.white} />
          </View>

          <Text style={styles.title}>{t('challenge.joinTitle')}</Text>
          <Text style={styles.subtitle}>{t('challenge.joinSubtitle')}</Text>

          <View style={styles.form}>
            <Text style={styles.label}>{t('challenge.yourName')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('challenge.namePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={20}
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('challenge.code')}</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={setCode}
              placeholder={t('challenge.codePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              returnKeyType="done"
              onSubmitEditing={canPlay ? handlePlay : undefined}
            />
            <Text style={styles.hint}>{t('challenge.codeHint')}</Text>
          </View>

          {/* Unsupported format warning */}
          {isUnsupported && (
            <View style={[styles.previewCard, { borderColor: colors.accent }]}>
              <View style={styles.previewHeader}>
                <CrossIcon size={16} color={colors.accent} />
                <Text style={[styles.previewHeaderText, { color: colors.accent }]}>{t('challenge.unsupportedCodeShort')}</Text>
              </View>
              <Text style={styles.previewLabel}>{t('challenge.unsupportedCode')}</Text>
            </View>
          )}

          {/* Live preview when a valid code is pasted */}
          {preview && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <CheckIcon size={16} color={colors.success} />
                <Text style={styles.previewHeaderText}>{t('challenge.previewValid')}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('challenge.previewMode')}</Text>
                <Text style={styles.previewValue}>{modeLabel}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('challenge.previewFlags', { count: preview.flagIds.length })}</Text>
                <Text style={styles.previewValue}>
                  {t('challenge.previewHostScore', { name: preview.hostName, correct: hostScore, total: preview.flagIds.length })}
                </Text>
              </View>
              {preview.timeLimit > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{t('challenge.previewTimeLimit', { seconds: preview.timeLimit })}</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.playButton, !canPlay && styles.playButtonDisabled]}
            onPress={handlePlay}
            disabled={!canPlay}
            activeOpacity={0.7}
          >
            <Text style={styles.playButtonText}>{t('challenge.play')}</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Play" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    backgroundColor: colors.ink,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.title,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  form: {},
  label: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
  },
  codeInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.success,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  previewHeaderText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.success,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  previewValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize.caption,
    color: colors.ink,
  },
  playButton: {
    ...buttons.primary,
    marginTop: spacing.xl,
  },
  playButtonDisabled: {
    backgroundColor: colors.textTertiary,
    shadowColor: colors.textTertiary,
  },
  playButtonText: {
    ...buttons.primaryText,
  },
});
