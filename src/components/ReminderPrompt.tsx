import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, spacing, borderRadius, fontFamily, fontSize, buildButtons } from '../utils/theme';
import { getSettings, saveSettings } from '../utils/storage';
import { toggleDailyReminder } from '../utils/notifications';
import { hapticTap } from '../utils/feedback';
import { BellIcon } from './Icons';
import { t } from '../utils/i18n';

interface Props {
  /** Only offer after a round the player can feel good about. */
  eligible: boolean;
}

/**
 * One-time offer to turn on the daily reminder, shown after a good round.
 * Reminders are off by default and otherwise only live in Settings.
 */
export default function ReminderPrompt({ eligible }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const btn = useMemo(() => buildButtons(colors), [colors]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!eligible || Platform.OS === 'web') return;
    getSettings().then((s) => {
      if (!s.dailyReminderEnabled && !s.reminderAsked) setVisible(true);
    }).catch(() => {});
  }, [eligible]);

  if (!visible) return null;

  const answer = async (enable: boolean) => {
    hapticTap();
    setVisible(false);
    const s = await getSettings();
    const enabled = enable ? await toggleDailyReminder(true, s.reminderHour, s.reminderMinute) : false;
    await saveSettings({ ...s, reminderAsked: true, dailyReminderEnabled: enabled });
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <BellIcon size={18} color={colors.gold} />
        <Text style={styles.title}>{t('results.reminderTitle')}</Text>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[btn.secondary, styles.half]}
          onPress={() => answer(false)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('results.reminderNo')}
        >
          <Text style={[btn.secondaryText, styles.btnText]}>{t('results.reminderNo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[btn.primary, styles.half]}
          onPress={() => answer(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('results.reminderYes')}
        >
          <Text style={[btn.primaryText, styles.btnText]}>{t('results.reminderYes')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      fontFamily: fontFamily.bodyBold,
      fontSize: fontSize.body,
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    half: {
      flex: 1,
      paddingVertical: spacing.sm + spacing.xs,
    },
    btnText: {
      fontSize: fontSize.body,
    },
  });
