import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontFamily, spacing } from '../utils/theme';
import { LightningIcon, CrosshairIcon, BarChartIcon, GlobeIcon } from './Icons';

type TabId = 'Play' | 'Modes' | 'Stats' | 'Browse';

interface BottomNavProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

const TABS: { id: TabId; icon: (active: boolean) => React.ReactNode; label: string }[] = [
  {
    id: 'Play',
    icon: (active) => <LightningIcon size={20} color={active ? colors.ink : colors.textTertiary} filled={active} />,
    label: 'Play',
  },
  {
    id: 'Modes',
    icon: (active) => <CrosshairIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
    label: 'Modes',
  },
  {
    id: 'Stats',
    icon: (active) => <BarChartIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
    label: 'Stats',
  },
  {
    id: 'Browse',
    icon: (active) => <GlobeIcon size={20} color={active ? colors.ink : colors.textTertiary} />,
    label: 'Browse',
  },
];

export default function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onNavigate(tab.id)}
            activeOpacity={0.6}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            {tab.icon(isActive)}
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
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
