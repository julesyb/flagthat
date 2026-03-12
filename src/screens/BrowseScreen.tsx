import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  fontFamily,
  fontSize,
  screenContainer,
} from '../utils/theme';
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
import { SearchIcon } from '../components/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Browse'>;

const REGIONS = ['All', 'Africa', 'Asia', 'Europe', 'Americas', 'Oceania'] as const;
const REGION_KEYS: Record<string, string> = {
  All: 'browse.all',
  Africa: 'browse.africa',
  Asia: 'browse.asia',
  Europe: 'browse.europe',
  Americas: 'browse.americas',
  Oceania: 'browse.oceania',
};
const PRACTICE_MORE = 'Practice More';
const NUM_COLUMNS = 3;

export default function BrowseScreen({ route, navigation }: Props) {
  const onNavigate = useNavTabs();
  const initialRegion = route.params?.region ?? 'All';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(initialRegion);
  const [missedFlagIds, setMissedFlagIds] = useState<string[]>([]);
  const [flagStats, setFlagStats] = useState<FlagStats>({});
  const { width: screenWidth } = useWindowDimensions();

  const allFlags = useMemo(() => getAllFlags(), []);

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
      flags = flags.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          flagName(f).toLowerCase().includes(q),
      );
    }
    return flags;
  }, [allFlags, selectedFilter, searchQuery, missedFlagIds, flagStats]);

  const filterOptions = useMemo(() => {
    if (missedFlagIds.length > 0) {
      return [...REGIONS, PRACTICE_MORE];
    }
    return [...REGIONS];
  }, [missedFlagIds]);

  // Calculate card dimensions based on available width
  const cardGap = spacing.sm;
  const horizontalPad = spacing.md * 2;
  const availableWidth = Math.min(screenWidth, 600) - horizontalPad;
  const cardWidth = (availableWidth - cardGap * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const flagHeight = Math.round(cardWidth * 0.67); // ~3:2 aspect ratio

  const renderItem = ({ item, index }: { item: FlagItem; index: number }) => {
    const isLastRow =
      index >= filteredFlags.length - (filteredFlags.length % NUM_COLUMNS || NUM_COLUMNS);
    return (
      <View
        style={[
          styles.card,
          {
            width: cardWidth,
            marginRight: (index + 1) % NUM_COLUMNS === 0 ? 0 : cardGap,
            marginBottom: isLastRow ? spacing.xxl : cardGap,
          },
        ]}
      >
        <View style={[styles.flagWrap, { height: flagHeight }]}>
          <FlagImage
            countryCode={item.id}
            size="small"
            fill
          />
        </View>
        <Text style={styles.countryName} numberOfLines={1}>
          {flagName(item)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenContainer flex>
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('browse.title')}</Text>
          <Text style={styles.pageSub}>
            {allFlags.length} {t('browse.countriesLabel')}
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <SearchIcon size={18} color={colors.textTertiary} />
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
        </View>

        {/* Region filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
          style={styles.chipRow}
        >
          {filterOptions.map((filter) => {
            const active = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {filter === PRACTICE_MORE
                    ? t('browse.practiceMore')
                    : REGION_KEYS[filter]
                      ? t(REGION_KEYS[filter])
                      : filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Result count */}
        <Text style={styles.resultCount}>
          {selectedFilter === PRACTICE_MORE && filteredFlags.length === 0
            ? t('browse.noMissedFlags')
            : filteredFlags.length === 1
              ? t('browse.flagCount', { count: filteredFlags.length })
              : t('browse.flagCountPlural', { count: filteredFlags.length })}
        </Text>

        {/* Flag grid */}
        <FlatList
          data={filteredFlags}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      </ScreenContainer>
      <BottomNav activeTab="Browse" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: screenContainer,
  pageHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  pageTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.title,
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  pageSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.text,
    paddingVertical: 0,
  },
  chipRow: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.goldBright,
    borderColor: colors.goldBright,
  },
  chipLabel: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.playText,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    alignItems: 'center',
  },
  flagWrap: {
    width: '100%',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
});
