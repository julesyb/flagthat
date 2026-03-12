import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getSettings, saveSettings, getDayStreak } from './storage';
import { colors } from './theme';
import { t } from './i18n';
import { MS_PER_DAY } from './config';

// Channel for Android
const DAILY_CHANNEL_ID = 'daily-challenge';

// Notification identifier so we can cancel/replace
const DAILY_NOTIFICATION_ID = 'daily-challenge-reminder';

/**
 * Configure notification behavior (shown even when app is foregrounded).
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions. Returns true if granted.
 */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Set up the Android notification channel.
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DAILY_CHANNEL_ID, {
      name: t('notification.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: colors.accent,
    });
  }
}

/**
 * Pick a localized message based on streak context.
 */
function pickMessage(streak: number): { title: string; body: string } {
  if (streak >= 3) {
    return {
      title: t('notification.streakTitle'),
      body: t('notification.streakBody', { streak }),
    };
  }
  // Rotate through 5 messages based on day of year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY);
  const idx = (dayOfYear % 5) + 1;
  return {
    title: t(`notification.title${idx}`),
    body: t(`notification.body${idx}`),
  };
}

/**
 * Schedule (or reschedule) the daily challenge reminder.
 * Cancels any existing reminder first, then schedules a repeating daily notification.
 */
async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel existing
  await cancelDailyReminder();

  const streak = await getDayStreak();
  const message = pickMessage(streak);

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_NOTIFICATION_ID,
    content: {
      title: message.title,
      body: message.body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: DAILY_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Cancel the daily challenge reminder.
 */
async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID);
}

/**
 * Sync notification schedule with current settings.
 * Call on app start and whenever settings change.
 */
export async function syncNotificationSchedule(): Promise<void> {
  if (Platform.OS === 'web') return;

  const settings = await getSettings();

  if (!settings.dailyReminderEnabled) {
    await cancelDailyReminder();
    return;
  }

  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    // Permission denied, disable the setting
    await saveSettings({ ...settings, dailyReminderEnabled: false });
    await cancelDailyReminder();
    return;
  }

  await setupAndroidChannel();
  await scheduleDailyReminder(settings.reminderHour, settings.reminderMinute);
}

/**
 * Toggle daily reminder on/off. Returns the new enabled state.
 * Handles permission request when enabling.
 */
export async function toggleDailyReminder(
  enable: boolean,
  hour: number,
  minute: number,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (!enable) {
    await cancelDailyReminder();
    return false;
  }

  const hasPermission = await requestPermissions();
  if (!hasPermission) return false;

  await setupAndroidChannel();
  await scheduleDailyReminder(hour, minute);
  return true;
}
