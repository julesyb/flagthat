import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spacing, buildButtons, typography, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { decodeResponse } from '../utils/challengeCode';
import { hapticCorrect, hapticWrong } from '../utils/feedback';
import { updateSentChallengeWithOpponent } from '../utils/storage';
import ScreenContainer from '../components/ScreenContainer';
import BottomNav from '../components/BottomNav';
import { useNavTabs } from '../hooks/useNavTabs';
import { t } from '../utils/i18n';
import { CheckIcon, CrossIcon } from '../components/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeResponse'>;

export default function ChallengeResponseScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onNavigate = useNavTabs();
  const responseCode = route.params?.code ?? '';

  const [result, setResult] = useState<{
    status: 'loading' | 'success' | 'not_found' | 'invalid';
    name?: string;
    score?: number;
    total?: number;
  }>({ status: 'loading' });

  useEffect(() => {
    if (!responseCode) {
      setResult({ status: 'invalid' });
      return;
    }

    const decoded = decodeResponse(responseCode);
    if (decoded.status !== 'ok') {
      hapticWrong();
      setResult({ status: 'invalid' });
      return;
    }

    const { recipientName, shortCode, recipientScore, totalFlags } = decoded.data;
    updateSentChallengeWithOpponent(shortCode, recipientName, recipientScore).then((found) => {
      if (found) {
        hapticCorrect();
        setResult({ status: 'success', name: recipientName, score: recipientScore, total: totalFlags });
      } else {
        hapticWrong();
        setResult({ status: 'not_found', name: recipientName, score: recipientScore, total: totalFlags });
      }
    });
  }, [responseCode]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
          {result.status === 'loading' && (
            <View style={styles.centered}>
              <Text style={styles.subtitle}>{t('common.loading')}</Text>
            </View>
          )}

          {result.status === 'success' && (
            <View style={styles.centered}>
              <View style={[styles.iconCircle, { backgroundColor: colors.success + '18' }]}>
                <CheckIcon size={28} color={colors.success} />
              </View>
              <Text style={styles.title}>{t('challenge.responseReceived')}</Text>
              <Text style={styles.subtitle}>
                {t('challenge.responseReceivedDesc', {
                  name: result.name || '',
                  score: String(result.score ?? 0),
                  total: String(result.total ?? 0),
                })}
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Stats')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('stats.challengeDetail')}
              >
                <Text style={styles.primaryButtonText}>{t('stats.challengeDetail')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {result.status === 'not_found' && (
            <View style={styles.centered}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warning + '18' }]}>
                <CrossIcon size={28} color={colors.warning} />
              </View>
              <Text style={styles.title}>{t('challenge.responseNotFound')}</Text>
              {result.name && (
                <Text style={styles.subtitle}>
                  {t('challenge.responseReceivedDesc', {
                    name: result.name,
                    score: String(result.score ?? 0),
                    total: String(result.total ?? 0),
                  })}
                </Text>
              )}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>{t('common.home')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {result.status === 'invalid' && (
            <View style={styles.centered}>
              <View style={[styles.iconCircle, { backgroundColor: colors.error + '18' }]}>
                <CrossIcon size={28} color={colors.error} />
              </View>
              <Text style={styles.title}>{t('challenge.invalidCodeTitle')}</Text>
              <Text style={styles.subtitle}>{t('challenge.invalidCode')}</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>{t('common.home')}</Text>
              </TouchableOpacity>
            </View>
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
      paddingTop: spacing.xxl,
    },
    centered: {
      alignItems: 'center',
      paddingTop: spacing.xl,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
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
    primaryButton: {
      ...btn.primary,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    primaryButtonText: {
      ...btn.primaryText,
      textAlign: 'center',
    },
    secondaryButton: {
      ...btn.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    secondaryButtonText: {
      ...btn.secondaryText,
      textAlign: 'center',
    },
  });
};
