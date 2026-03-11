import React, { useState, useCallback, useEffect } from 'react';
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
import { colors, spacing, typography, fontFamily, fontSize, borderRadius } from '../utils/theme';
import { useLayout } from '../utils/useLayout';
import { getSettings, saveSettings, AppSettings, resetStats } from '../utils/storage';
import {
  setSoundsEnabled,
  setHapticsEnabled,
} from '../utils/feedback';
import { toggleDailyReminder, syncNotificationSchedule } from '../utils/notifications';
import { t, setLocale, getLocale, SUPPORTED_LOCALES, LocaleCode } from '../utils/i18n';
import { ChevronRightIcon, ChevronDownIcon, CheckIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const onNavigate = useNavTabs();
  const { isDesktop } = useLayout();
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
    dailyReminderEnabled: false,
    reminderHour: 9,
    reminderMinute: 0,
    locale: null,
  });
  const [, forceRender] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
    }, []),
  );

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
    const period = hour >= 12 ? 'PM' : 'AM';
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

  // Close language dropdown on Escape key (web)
  useEffect(() => {
    if (Platform.OS !== 'web' || !langOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setLangOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [langOpen]);

  const currentLocaleName = SUPPORTED_LOCALES.find((l) => l.code === getLocale())?.name ?? 'English';

  const handleReset = async () => {
    if (Platform.OS === 'web') {
      setShowResetConfirm(true);
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

  const confirmReset = async () => {
    await resetStats();
    setShowResetConfirm(false);
  };

  // Close reset confirm dialog on Escape
  useEffect(() => {
    if (Platform.OS !== 'web' || !showResetConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowResetConfirm(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showResetConfirm]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
        <View style={isDesktop ? styles.settingsGrid : undefined}>
        {/* Column 1 on desktop */}
        <View style={isDesktop ? styles.settingsCol : undefined}>
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

        </View>
        {/* Column 2 on desktop */}
        <View style={isDesktop ? styles.settingsCol : undefined}>
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
            onPress={() => Linking.openURL('https://flagthat.app/privacy')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>{t('settings.privacyPolicy')}</Text>
            <ChevronRightIcon size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://flagthat.app/terms')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>{t('settings.termsOfService')}</Text>
            <ChevronRightIcon size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('mailto:support@flagthat.app')}
            activeOpacity={0.7}
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
        >
          <Text style={styles.resetButtonText}>{t('settings.resetAllData')}</Text>
        </TouchableOpacity>
        </View>
        </View>
        </ScreenContainer>
      </ScrollView>
      <BottomNav activeTab="Play" onNavigate={onNavigate} />

      {/* Styled reset confirmation for web */}
      {showResetConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.resetConfirmTitle')}</Text>
            <Text style={styles.modalBody}>{t('settings.resetConfirmMsg')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowResetConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDestructiveBtn}
                onPress={confirmReset}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDestructiveText}>{t('settings.reset')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    paddingBottom: spacing.xxl,
  },
  settingsGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  settingsCol: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xxs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
    fontSize: fontSize.body,
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
    fontSize: fontSize.body,
    letterSpacing: 0.5,
  },
  langRowActive: {
    backgroundColor: colors.surfaceSecondary,
  },
  langOptionText: {
    ...typography.body,
    color: colors.text,
    fontSize: fontSize.body,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.xl,
    maxWidth: 380,
    width: '90%',
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  modalDestructiveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
  },
  modalDestructiveText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
