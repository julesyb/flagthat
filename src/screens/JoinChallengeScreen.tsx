import React, { useState, useMemo, useEffect } from 'react';
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
import { spacing, fontFamily, fontSize, buildButtons, borderRadius, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { decodeChallenge, buildChallengeQuestions, getScreenForMode, ChallengeData, ChallengeScreenName } from '../utils/challengeCode';
import { hapticTap, hapticWrong } from '../utils/feedback';
import ScreenContainer from '../components/ScreenContainer';
import BottomNav from '../components/BottomNav';
import { useNavTabs } from '../hooks/useNavTabs';
import { t } from '../utils/i18n';
import { getChallengeName, saveChallengeName } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinChallenge'>;

export default function JoinChallengeScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onNavigate = useNavTabs();
  const initialCode = route.params?.code ?? '';
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');

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
  const canPlay = decoded?.status === 'ok' && name.trim().length > 0;

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
    const params = {
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

    (navigation.replace as (screen: string, params: typeof params) => void)(screen, params);
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
          {/* Challenge headline when code is valid */}
          {preview ? (
            <View style={styles.headline}>
              <Text style={styles.headlineScore}>{hostScore}/{preview.flagIds.length}</Text>
              <Text style={styles.headlineSub}>
                {t('challenge.previewHostScore', { name: preview.hostName, correct: hostScore, total: preview.flagIds.length })}
              </Text>
            </View>
          ) : (
            <Text style={styles.title}>{t('challenge.joinTitle')}</Text>
          )}

          {/* Code input - only show if no code pre-filled */}
          {!initialCode && (
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder={t('challenge.codePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel={t('challenge.codePlaceholder')}
            />
          )}

          {/* Name input */}
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('challenge.namePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={20}
            autoFocus={!!initialCode}
            returnKeyType="done"
            onSubmitEditing={canPlay ? handlePlay : undefined}
            accessibilityLabel={t('challenge.namePlaceholder')}
          />

          {/* Error state */}
          {code.trim().length > 0 && decoded?.status === 'invalid' && (
            <Text style={styles.error}>{t('challenge.invalidCode')}</Text>
          )}
          {decoded?.status === 'unsupported' && (
            <Text style={styles.error}>{t('challenge.unsupportedCode')}</Text>
          )}

          <TouchableOpacity
            style={[styles.playButton, !canPlay && styles.playButtonDisabled]}
            onPress={handlePlay}
            disabled={!canPlay}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('challenge.play')}
            accessibilityState={{ disabled: !canPlay }}
          >
            <Text style={styles.playButtonText}>{t('challenge.play')}</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Play" onNavigate={onNavigate} />
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
    paddingTop: spacing.xxl,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.title,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.lg,
  },
  headline: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headlineScore: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.countdown,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 80,
  },
  headlineSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  playButton: {
    ...btn.primary,
    marginTop: spacing.md,
  },
  playButtonDisabled: {
    backgroundColor: colors.textTertiary,
    shadowColor: colors.textTertiary,
  },
  playButtonText: {
    ...btn.primaryText,
  },
}); };
