import React, { useState, useCallback } from 'react';
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
import { colors, spacing, typography, fontFamily, borderRadius } from '../utils/theme';
import { getSettings, saveSettings, AppSettings, resetStats } from '../utils/storage';
import {
  setSoundsEnabled,
  setHapticsEnabled,
} from '../utils/feedback';
import BottomNav from '../components/BottomNav';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
  });

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

  const handleReset = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Reset all data?\n\nThis will clear all stats, streaks, and progress. This cannot be undone.');
      if (confirmed) {
        await resetStats();
      }
    } else {
      Alert.alert(
        'Reset All Data',
        'This will clear all stats, streaks, and progress. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => resetStats(),
          },
        ],
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Sound & Haptics */}
        <Text style={styles.sectionTitle}>Sound & Haptics</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingDesc}>Correct, wrong, and celebration sounds</Text>
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
              <Text style={styles.settingLabel}>Haptics</Text>
              <Text style={styles.settingDesc}>Vibration feedback on answers</Text>
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
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Linking.openSettings();
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notification Settings</Text>
              <Text style={styles.settingDesc}>
                {Platform.OS === 'web'
                  ? 'Notifications managed in browser settings'
                  : 'Opens system notification settings'}
              </Text>
            </View>
            <Text style={styles.settingChevron}>&rsaquo;</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://flagthat.app/privacy')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.settingChevron}>&rsaquo;</Text>
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://flagthat.app/terms')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.settingChevron}>&rsaquo;</Text>
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('mailto:support@flagthat.app')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Support</Text>
            <Text style={styles.settingChevron}>&rsaquo;</Text>
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>Data</Text>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>Reset All Data</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav activeTab="Stats" onNavigate={(tab) => {
        if (tab === 'Play') navigation.navigate('Home');
        else if (tab === 'Modes') navigation.navigate('GameSetup');
        else if (tab === 'Stats') navigation.navigate('Stats');
        else if (tab === 'Browse') navigation.navigate('Browse');
      }} />
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
  sectionTitle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 10,
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
    fontSize: 15,
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
  settingChevron: {
    fontSize: 22,
    color: colors.textTertiary,
    lineHeight: 22,
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
