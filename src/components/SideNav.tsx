import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { colors, fontFamily, fontSize, spacing, layout, borderRadius } from '../utils/theme';
import { LightningIcon, CrosshairIcon, BarChartIcon, GlobeIcon } from './Icons';
import { TabId } from './BottomNav';
import { t } from '../utils/i18n';

interface SideNavProps {
  onNavigate: (tab: TabId) => void;
}

const TAB_ICONS: Record<TabId, (active: boolean) => React.ReactNode> = {
  Play: (active) => <LightningIcon size={20} color={active ? colors.ink : colors.textTertiary} filled={active} />,
  Modes: (active) => <CrosshairIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
  Stats: (active) => <BarChartIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
  Browse: (active) => <GlobeIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
};

const TAB_KEYS: { id: TabId; labelKey: string }[] = [
  { id: 'Play', labelKey: 'nav.play' },
  { id: 'Modes', labelKey: 'nav.modes' },
  { id: 'Stats', labelKey: 'nav.stats' },
  { id: 'Browse', labelKey: 'nav.browse' },
];

// Map route names to tab IDs
const ROUTE_TO_TAB: Record<string, TabId> = {
  Home: 'Play',
  GameSetup: 'Modes',
  Stats: 'Stats',
  Browse: 'Browse',
  Settings: 'Play',
  Results: 'Play',
};

export default function SideNav({ onNavigate }: SideNavProps) {
  const currentRoute = useNavigationState((state) => {
    const route = state.routes[state.index];
    return route?.name ?? 'Home';
  });
  const activeTab = ROUTE_TO_TAB[currentRoute] ?? 'Play';

  return (
    <View style={styles.container}>
      {/* Wordmark */}
      <View style={styles.wordmark}>
        <Text style={styles.wmLine1}>Flag</Text>
        <Text style={styles.wmLine2}>That</Text>
      </View>

      <View style={styles.navItems}>
        {TAB_KEYS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(tab.id)}
              activeOpacity={0.6}
              accessibilityRole="tab"
              accessibilityLabel={t(tab.labelKey)}
              accessibilityState={{ selected: isActive }}
            >
              {TAB_ICONS[tab.id](isActive)}
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: layout.sidebarWidth,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.rule,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    ...(Platform.OS === 'web' ? { height: '100%' as unknown as number } : {}),
  },
  wordmark: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: spacing.lg,
  },
  wmLine1: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  wmLine2: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 24,
    lineHeight: 28,
    color: colors.accent,
  },
  navItems: {
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  navItemActive: {
    backgroundColor: colors.surfaceSecondary,
  },
  navLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  navLabelActive: {
    color: colors.ink,
  },
});
