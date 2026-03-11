import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { FlagItem } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getAllFlags } from '../data';
import FlagImage from '../components/FlagImage';
import { getMissedFlagIds, getFlagStats, FlagStats } from '../utils/storage';
import { t } from '../utils/i18n';
import { flagName } from '../data/countryNames';
import BottomNav from '../components/BottomNav';
import ScreenContainer from '../components/ScreenContainer';
import { useNavTabs } from '../hooks/useNavTabs';
import { useLayout } from '../utils/useLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'Browse'>;

const REGIONS = ['All', 'Africa', 'Asia', 'Europe', 'Americas', 'Oceania'] as const;
const REGION_KEYS: Record<string, string> = {
  'All': 'browse.all',
  'Africa': 'browse.africa',
  'Asia': 'browse.asia',
  'Europe': 'browse.europe',
  'Americas': 'browse.americas',
  'Oceania': 'browse.oceania',
};
const PRACTICE_MORE = 'Practice More';

export default function BrowseScreen({ route, navigation }: Props) {
  const onNavigate = useNavTabs();
  const { isDesktop } = useLayout();
  const numColumns = isDesktop ? 2 : 1;
  const initialRegion = route.params?.region ?? 'All';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(initialRegion);
  const [missedFlagIds, setMissedFlagIds] = useState<string[]>([]);
  const [flagStats, setFlagStats] = useState<FlagStats>({});

  const allFlags = useMemo(() => getAllFlags(), []);

  // Reload missed flags each time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      getMissedFlagIds().then(setMissedFlagIds);
      getFlagStats().then(setFlagStats);
    }, []),
  );

  const filteredFlags = useMemo(() => {
    let flags = allFlags;
    if (selectedFilter === PRACTICE_MORE) {
      const missedSet = new Set(missedFlagIds);
      flags = flags.filter((f) => missedSet.has(f.id));
      // Sort by most wrong first
      flags = flags.sort((a, b) => {
        const aWrong = flagStats[a.id]?.wrong ?? 0;
        const bWrong = flagStats[b.id]?.wrong ?? 0;
        return bWrong - aWrong;
      });
    } else {
      if (selectedFilter !== 'All') {
        flags = flags.filter((f) => f.region === selectedFilter);
      }
      flags = flags.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      flags = flags.filter((f) => f.name.toLowerCase().includes(q) || flagName(f).toLowerCase().includes(q));
    }
    return flags;
  }, [allFlags, selectedFilter, searchQuery, missedFlagIds, flagStats]);

  const filterOptions = useMemo(() => {
    if (missedFlagIds.length > 0) {
      return [...REGIONS, PRACTICE_MORE];
    }
    return REGIONS;
  }, [missedFlagIds]);

  const renderItem = ({ item }: { item: FlagItem }) => {
    const stats = flagStats[item.id];
    const showWrongCount = selectedFilter === PRACTICE_MORE && stats;

    return (
      <View style={styles.flagItem}>
        <FlagImage countryCode={item.id} emoji={item.emoji} size="medium" />
        <View style={styles.flagInfo}>
          <Text style={styles.flagName}>{flagName(item)}</Text>
          <Text style={styles.flagRegion}>
            {item.region}
            {showWrongCount
              ? ` · ${stats.wrong === 1 ? t('browse.missedCount', { count: stats.wrong }) : t('browse.missedCountPlural', { count: stats.wrong })}`
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenContainer flex>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('browse.searchPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          clearButtonMode="while-editing"
          accessibilityLabel={t('browse.searchPlaceholder')}
        />
      </View>

      <View style={styles.regionWrap}>
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.regionChip,
              selectedFilter === filter && styles.regionChipActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.regionLabel,
                selectedFilter === filter && styles.regionLabelActive,
              ]}
            >
              {filter === PRACTICE_MORE ? t('browse.practiceMore') : (REGION_KEYS[filter] ? t(REGION_KEYS[filter]) : filter)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.resultCount}>
        {selectedFilter === PRACTICE_MORE && filteredFlags.length === 0
          ? t('browse.noMissedFlags')
          : filteredFlags.length === 1 ? t('browse.flagCount', { count: filteredFlags.length }) : t('browse.flagCountPlural', { count: filteredFlags.length })}
      </Text>

      <FlatList
        key={numColumns}
        data={filteredFlags}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />
      </ScreenContainer>
      <BottomNav activeTab="Browse" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  regionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  regionChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.rule2,
    borderRadius: borderRadius.sm,
  },
  regionChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  regionLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  regionLabelActive: {
    color: colors.white,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  columnWrapper: {
    gap: spacing.sm,
  },
  flagItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  flagInfo: {
    flex: 1,
  },
  flagName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  flagRegion: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});
