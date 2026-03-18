import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Constants from 'expo-constants';
import { spacing, typography, fontFamily, fontSize, borderRadius, APP_URL, APP_DOMAIN, ThemeColors, ThemeMode } from '../utils/theme';
import { getSettings, saveSettings, AppSettings, resetStats, getSkillLevel, saveSkillLevel, SkillLevel } from '../utils/storage';
import {
  setSoundsEnabled,
  setHapticsEnabled,
} from '../utils/feedback';
import { toggleDailyReminder, syncNotificationSchedule } from '../utils/notifications';
import { t, setLocale, getLocale, SUPPORTED_LOCALES, LocaleCode } from '../utils/i18n';
import { ChevronRightIcon, ChevronDownIcon, CheckIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import PageHeader from '../components/PageHeader';
import { useNavTabs } from '../hooks/useNavTabs';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const onNavigate = useNavTabs();
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
    dailyReminderEnabled: false,
    reminderHour: 9,
    reminderMinute: 0,
    locale: null,
    themeMode: 'dark',
  });
  const [, forceRender] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
      getSkillLevel().then(setSkillLevel);
    }, []),
  );

  const handleSkillChange = async (level: SkillLevel) => {
    setSkillLevel(level);
    await saveSkillLevel(level);
  };

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);

    if (key === 'soundEnabled') setSoundsEnabled(value as boolean);
    if (key === 'hapticsEnabled') setHapticsEnabled(value as boolean);
  };

  const handleToggleReminder = async (enabled: boolean) => {
    const result = await toggleDailyReminder(
      enabled,
      settings.reminderHour,
      settings.reminderMinute,
    );
    const updated = { ...settings, dailyReminderEnabled: result };
    setSettings(updated);
    await saveSettings(updated);

    if (enabled && !result && Platform.OS !== 'web') {
      Alert.alert(
        t('settings.notificationsDisabled'),
        t('settings.notificationsAlert'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const cycleReminderTime = async () => {
    const times = [
      { h: 7, m: 0 },
      { h: 8, m: 0 },
      { h: 9, m: 0 },
      { h: 10, m: 0 },
      { h: 12, m: 0 },
      { h: 18, m: 0 },
      { h: 20, m: 0 },
      { h: 21, m: 0 },
    ];
    const currentIdx = times.findIndex(
      (ti) => ti.h === settings.reminderHour && ti.m === settings.reminderMinute,
    );
    const next = times[(currentIdx + 1) % times.length];
    const updated = { ...settings, reminderHour: next.h, reminderMinute: next.m };
    setSettings(updated);
    await saveSettings(updated);

    if (settings.dailyReminderEnabled) {
      await toggleDailyReminder(true, next.h, next.m);
    }
  };

  const formatTime = (hour: number, minute: number): string => {
    const locale = getLocale();
    const use24h = locale !== 'en';
    const m = minute.toString().padStart(2, '0');
    if (use24h) {
      return `${hour.toString().padStart(2, '0')}:${m}`;
    }
    const period = hour >= 12 ? t('settings.pm') : t('settings.am');
    const h = hour % 12 || 12;
    return `${h}:${m} ${period}`;
  };

  const selectLanguage = async (code: LocaleCode) => {
    setLocale(code);
    const updated = { ...settings, locale: code };
    setSettings(updated);
    await saveSettings(updated);
    setLangOpen(false);
    forceRender((n) => n + 1);
    if (settings.dailyReminderEnabled) {
      syncNotificationSchedule();
    }
  };

  const currentLocaleName = SUPPORTED_LOCALES.find((l) => l.code === getLocale())?.name ?? 'English';

  const handleReset = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('settings.resetConfirmWeb'));
      if (confirmed) {
        await resetStats();
      }
    } else {
      Alert.alert(
        t('settings.resetConfirmTitle'),
        t('settings.resetConfirmMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.reset'),
            style: 'destructive',
            onPress: () => resetStats(),
          },
        ],
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
        {/* Appearance */}
        <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.theme')}</Text>
              <Text style={styles.settingDesc}>{t('settings.themeDesc')}</Text>
            </View>
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.themeRow}>
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isActive = themeMode === mode;
              const label = t(`settings.theme${mode.charAt(0).toUpperCase() + mode.slice(1)}` as 'settings.themeLight');
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.themeOption, isActive && styles.themeOptionActive]}
                  onPress={() => setThemeMode(mode)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.themeOptionText, isActive && styles.themeOptionTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Skill Level */}
        {skillLevel && (
          <>
            <Text style={styles.sectionTitle}>{t('settings.skillLevel')}</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t('settings.skillLevel')}</Text>
                  <Text style={styles.settingDesc}>{t('settings.skillLevelDesc')}</Text>
                </View>
              </View>
              <View style={styles.settingDivider} />
              <View style={styles.skillRow}>
                {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((level) => {
                  const isActive = skillLevel === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.skillOption, isActive && styles.skillOptionActive]}
                      onPress={() => handleSkillChange(level)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t(`onboarding.skill${level.charAt(0).toUpperCase() + level.slice(1)}Tag`)}
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={[styles.skillOptionText, isActive && styles.skillOptionTextActive]}>
                        {t(`onboarding.skill${level.charAt(0).toUpperCase() + level.slice(1)}Tag`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Sound & Haptics */}
        <Text style={styles.sectionTitle}>{t('settings.soundHaptics')}</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.soundEffects')}</Text>
              <Text style={styles.settingDesc}>{t('settings.soundDesc')}</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => updateSetting('soundEnabled', v)}
              trackColor={{ false: colors.rule, true: colors.ink }}
              thumbColor={colors.white}
              accessibilityRole="switch"
              accessibilityLabel={t('settings.soundEffects')}
              accessibilityState={{ checked: settings.soundEnabled }}
            />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.haptics')}</Text>
              <Text style={styles.settingDesc}>{t('settings.hapticsDesc')}</Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(v) => updateSetting('hapticsEnabled', v)}
              trackColor={{ false: colors.rule, true: colors.ink }}
              thumbColor={colors.white}
              accessibilityRole="switch"
              accessibilityLabel={t('settings.haptics')}
              accessibilityState={{ checked: settings.hapticsEnabled }}
            />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.dailyReminder')}</Text>
              <Text style={styles.settingDesc}>
                {Platform.OS === 'web'
                  ? t('settings.reminderDescWeb')
                  : t('settings.reminderDescMobile')}
              </Text>
            </View>
            <Switch
              value={settings.dailyReminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: colors.rule, true: colors.ink }}
              thumbColor={colors.white}
              disabled={Platform.OS === 'web'}
              accessibilityRole="switch"
              accessibilityLabel={t('settings.dailyReminder')}
              accessibilityState={{ checked: settings.dailyReminderEnabled, disabled: Platform.OS === 'web' }}
            />
          </View>
          {Platform.OS !== 'web' && (
            <>
              <View style={styles.settingDivider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={cycleReminderTime}
                activeOpacity={0.7}
                disabled={!settings.dailyReminderEnabled}
                accessibilityRole="button"
                accessibilityLabel={`${t('settings.reminderTime')}: ${formatTime(settings.reminderHour, settings.reminderMinute)}`}
                accessibilityHint={t('settings.tapToChange')}
                accessibilityState={{ disabled: !settings.dailyReminderEnabled }}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, !settings.dailyReminderEnabled && styles.settingDisabled]}>
                    {t('settings.reminderTime')}
                  </Text>
                  <Text style={styles.settingDesc}>{t('settings.tapToChange')}</Text>
                </View>
                <Text style={[styles.settingTimeValue, !settings.dailyReminderEnabled && styles.settingDisabled]}>
                  {formatTime(settings.reminderHour, settings.reminderMinute)}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Language */}
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>

        <View style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setLangOpen(!langOpen)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('settings.language')}: ${currentLocaleName}`}
            accessibilityHint={t('a11y.opensLanguage')}
            accessibilityState={{ expanded: langOpen }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{currentLocaleName}</Text>
              <Text style={styles.settingDesc}>{t('settings.languageDesc')}</Text>
            </View>
            <ChevronDownIcon
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          {langOpen && (
            <>
              {SUPPORTED_LOCALES.map((locale) => {
                const isActive = locale.code === getLocale();
                return (
                  <React.Fragment key={locale.code}>
                    <View style={styles.settingDivider} />
                    <TouchableOpacity
                      style={[styles.settingRow, isActive && styles.langRowActive]}
                      onPress={() => selectLanguage(locale.code)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={locale.name}
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={[styles.langOptionText, isActive && styles.langOptionActive]}>
                        {locale.name}
                      </Text>
                      {isActive && <CheckIcon size={16} color={colors.ink} />}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('settings.version')}</Text>
            <Text style={styles.settingValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL(`${APP_URL}/privacy`).catch(() => {})}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t('settings.privacyPolicy')}
          >
            <Text style={styles.settingLabel}>{t('settings.privacyPolicy')}</Text>
            <ChevronRightIcon size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL(`${APP_URL}/terms`).catch(() => {})}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t('settings.termsOfService')}
          >
            <Text style={styles.settingLabel}>{t('settings.termsOfService')}</Text>
            <ChevronRightIcon size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL(`mailto:support@${APP_DOMAIN}`).catch(() => {})}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t('settings.support')}
          >
            <Text style={styles.settingLabel}>{t('settings.support')}</Text>
            <ChevronRightIcon size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('settings.resetAllData')}
          accessibilityHint={t('a11y.deletesProgress')}
        >
          <Text style={styles.resetButtonText}>{t('settings.resetAllData')}</Text>
        </TouchableOpacity>
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Settings" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.eyebrow,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingVertical: 14,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  settingDesc: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  settingValue: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  settingDisabled: {
    opacity: 0.35,
  },
  settingTimeValue: {
    ...typography.bodyBold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  themeRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  skillRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  skillOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  skillOptionActive: {
    backgroundColor: colors.goldBright,
  },
  skillOptionText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  skillOptionTextActive: {
    color: colors.playText,
    fontFamily: fontFamily.bodyBold,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  themeOptionActive: {
    backgroundColor: colors.goldBright,
  },
  themeOptionText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  themeOptionTextActive: {
    color: colors.playText,
    fontFamily: fontFamily.bodyBold,
  },
  langRowActive: {
    backgroundColor: colors.surfaceSecondary,
  },
  langOptionText: {
    ...typography.body,
    color: colors.text,
  },
  langOptionActive: {
    fontFamily: fontFamily.bodyBold,
  },
  resetButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  resetButtonText: {
    ...typography.label,
    color: colors.error,
  },
});
