import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontFamily, spacing } from '../utils/theme';
import { LightningIcon, CrosshairIcon, BarChartIcon, GlobeIcon } from './Icons';
import { t } from '../utils/i18n';

type TabId = 'Play' | 'Modes' | 'Stats' | 'Browse';

interface BottomNavProps {
  activeTab: TabId;
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

export default function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
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
            {TAB_ICONS[tab.id](isActive)}
            <Text style={[styles.label, isActive && styles.labelActive]}>{t(tab.labelKey)}</Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.background,
    paddingTop: 6,
    paddingBottom: 20,
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
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
  },
  labelActive: {
    color: colors.ink,
  },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginTop: 2,
  },
});
