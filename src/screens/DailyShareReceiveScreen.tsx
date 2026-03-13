import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography, ThemeColors } from '../utils/theme';
import { decodeDailyShare } from '../utils/challengeCode';
import { addDailyLeaderboardEntry } from '../utils/storage';
import { getTodayDateString } from '../utils/gameEngine';
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
          }
        }
      }
      if (!valid && code) {
        Alert.alert(t('daily.invalidShareCode'), t('daily.invalidShareCodeDesc'));
      }
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
