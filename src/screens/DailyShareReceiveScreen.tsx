import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, ThemeColors } from '../utils/theme';
import { decodeDailyShare } from '../utils/challengeCode';
import { addDailyLeaderboardEntry, isDailyCompleteToday, getDailyChallengeData } from '../utils/storage';
import { getTodayDateString, getDailyConfig, getDailyVariant } from '../utils/gameEngine';
import { DAILY_QUESTION_COUNT, DAILY_LEADERBOARD_MAX_AGE_DAYS } from '../utils/config';
import { t } from '../utils/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyShareReceive'>;

/** Validate date string using pure string comparison to avoid timezone issues. */
function isDateValid(dateStr: string): boolean {
  // Validate it parses as a real date
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return false;

  const today = getTodayDateString(); // YYYY-MM-DD in local time
  // Not in the future (string comparison works for YYYY-MM-DD)
  if (dateStr > today) return false;
  // Within retention window: compute cutoff date string
  const now = new Date();
  now.setDate(now.getDate() - DAILY_LEADERBOARD_MAX_AGE_DAYS);
  const cutoffY = now.getFullYear();
  const cutoffM = String(now.getMonth() + 1).padStart(2, '0');
  const cutoffD = String(now.getDate()).padStart(2, '0');
  const cutoff = `${cutoffY}-${cutoffM}-${cutoffD}`;
  return dateStr >= cutoff;
}

export default function DailyShareReceiveScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const code = route.params?.code;

  useEffect(() => {
    async function process() {
      let valid = false;
      let shareDate: string | null = null;
      if (code) {
        const result = decodeDailyShare(code);
        if (result.status === 'ok') {
          const { name, date, score, totalTimeMs } = result.data;
          if (isDateValid(date) && score >= 0 && score <= DAILY_QUESTION_COUNT) {
            await addDailyLeaderboardEntry(date, {
              name,
              score,
              totalTimeMs,
              isMe: false,
            });
            valid = true;
            shareDate = date;
          }
        }
      }
      if (!valid && code) {
        Alert.alert(t('daily.invalidShareCode'), t('daily.invalidShareCodeDesc'));
        navigation.replace('Home');
        return;
      }

      // If the share is for today's challenge, route to quiz or results
      const today = getTodayDateString();
      if (shareDate === today) {
        const alreadyDone = await isDailyCompleteToday();
        if (alreadyDone) {
          // Already completed - show results
          const saved = await getDailyChallengeData();
          if (saved && saved.results && saved.results.length > 0) {
            const config = getDailyConfig(today);
            navigation.replace('Results', {
              results: saved.results,
              config,
              reviewOnly: true,
            });
            return;
          }
        } else {
          // Not yet completed - go straight to the daily quiz
          const config = getDailyConfig(today);
          const variant = getDailyVariant(today);
          if (variant.gameType === 'flagpuzzle') {
            navigation.replace('FlagPuzzle', { config });
          } else if (variant.gameType === 'capitalconnection') {
            navigation.replace('CapitalConnection', { config });
          } else {
            navigation.replace('Game', { config });
          }
          return;
        }
      }

      // Fallback: go home
      navigation.replace('Home');
    }
    process();
  }, [code, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.goldBright} />
        <Text style={styles.text}>{t('common.loading')}</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  text: { ...typography.caption, color: colors.textSecondary },
});
