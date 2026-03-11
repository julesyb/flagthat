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
import { FlagImageSmall } from '../components/FlagImage';
import { getMissedFlagIds, getFlagStats, FlagStats } from '../utils/storage';
import BottomNav from '../components/BottomNav';

type Props = NativeStackScreenProps<RootStackParamList, 'Browse'>;

const REGIONS = ['All', 'Africa', 'Asia', 'Europe', 'Americas', 'Oceania'];
const PRACTICE_MORE = 'Practice More';

export default function BrowseScreen({ route, navigation }: Props) {
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
      flags = flags.filter((f) => f.name.toLowerCase().includes(q));
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
        <FlagImageSmall countryCode={item.id} emoji={item.emoji} />
        <View style={styles.flagInfo}>
          <Text style={styles.flagName}>{item.name}</Text>
          <Text style={styles.flagRegion}>
            {item.region}
            {showWrongCount
              ? ` · missed ${stats.wrong} time${stats.wrong !== 1 ? 's' : ''}`
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search flags..."
          placeholderTextColor={colors.textTertiary}
          clearButtonMode="while-editing"
          accessibilityLabel="Search flags"
        />
      </View>

      <FlatList
        horizontal
        data={filterOptions}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionList}
        style={styles.regionScroll}
        renderItem={({ item: filter }) => (
          <TouchableOpacity
            style={[
              styles.regionChip,
              selectedFilter === filter && styles.regionChipActive,
              filter === PRACTICE_MORE && selectedFilter !== filter && styles.practiceChip,
              filter === PRACTICE_MORE && selectedFilter === filter && styles.practiceChipActive,
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
              {filter}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.resultCount}>
        {selectedFilter === PRACTICE_MORE && filteredFlags.length === 0
          ? 'No missed flags yet - keep playing!'
          : `${filteredFlags.length} flag${filteredFlags.length !== 1 ? 's' : ''}`}
      </Text>

      <FlatList
        data={filteredFlags}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />
      <BottomNav activeTab="Browse" onNavigate={(tab) => {
        if (tab === 'Play') navigation.navigate('Home');
        else if (tab === 'Modes') navigation.navigate('GameSetup');
        else if (tab === 'Stats') navigation.navigate('Stats');
      }} />
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
  regionScroll: {
    maxHeight: 48,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  regionList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
  practiceChip: {
    borderColor: colors.accent,
  },
  practiceChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
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
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
