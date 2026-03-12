import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fontFamily, fontSize, spacing, layout, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { HomeIcon, CrosshairIcon, BarChartIcon, GlobeIcon, GearIcon } from './Icons';
import { t } from '../utils/i18n';

export type TabId = 'Home' | 'Modes' | 'Stats' | 'Browse' | 'Settings';

interface BottomNavProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

const TAB_ICONS: Record<TabId, (active: boolean, colors: ThemeColors) => React.ReactNode> = {
  Home: (active, colors) => <HomeIcon size={20} color={active ? colors.ink : colors.textTertiary} filled={active} />,
  Modes: (active, colors) => <CrosshairIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
  Stats: (active, colors) => <BarChartIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
  Browse: (active, colors) => <GlobeIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
  Settings: (active, colors) => <GearIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
};

const TAB_KEYS: { id: TabId; labelKey: string }[] = [
  { id: 'Home', labelKey: 'nav.home' },
  { id: 'Modes', labelKey: 'nav.modes' },
  { id: 'Stats', labelKey: 'nav.stats' },
  { id: 'Browse', labelKey: 'nav.browse' },
  { id: 'Settings', labelKey: 'nav.settings' },
];

export default function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      <View style={styles.inner}>
        {TAB_KEYS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => onNavigate(tab.id)}
              activeOpacity={0.6}
              accessibilityRole="tab"
              accessibilityLabel={t(tab.labelKey)}
              accessibilityState={{ selected: isActive }}
            >
              {isActive && <View style={styles.activeBar} />}
              {TAB_ICONS[tab.id](isActive, colors)}
              <Text style={[styles.label, isActive && styles.labelActive]}>{t(tab.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.navBg,
    paddingTop: 6,
    paddingBottom: 20,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: layout.maxContentWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 3,
  },
  label: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  labelActive: {
    color: colors.ink,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 2,
    backgroundColor: colors.goldBright,
    borderRadius: 1,
  },
});

