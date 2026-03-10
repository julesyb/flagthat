import React, { useState, useMemo } from 'react';
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
import { colors, spacing, typography } from '../utils/theme';
import { FlagItem } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getAllFlags } from '../data';
import { FlagImageSmall } from '../components/FlagImage';

type Props = NativeStackScreenProps<RootStackParamList, 'Browse'>;

const REGIONS = ['All', 'Africa', 'Asia', 'Europe', 'Americas', 'Oceania'];

export default function BrowseScreen({ route }: Props) {
  const initialRegion = route.params?.region ?? 'All';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(initialRegion);

  const allFlags = useMemo(() => getAllFlags(), []);

  const filteredFlags = useMemo(() => {
    let flags = allFlags;
    if (selectedRegion !== 'All') {
      flags = flags.filter((f) => f.region === selectedRegion);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      flags = flags.filter((f) => f.name.toLowerCase().includes(q));
    }
    return flags.sort((a, b) => a.name.localeCompare(b.name));
  }, [allFlags, selectedRegion, searchQuery]);

  const renderItem = ({ item }: { item: FlagItem }) => (
    <View style={styles.flagItem}>
      <FlagImageSmall countryCode={item.id} emoji={item.emoji} />
      <View style={styles.flagInfo}>
        <Text style={styles.flagName}>{item.name}</Text>
        <Text style={styles.flagRegion}>{item.region}</Text>
      </View>
    </View>
  );

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
        />
      </View>

      <FlatList
        horizontal
        data={REGIONS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionList}
        style={styles.regionScroll}
        renderItem={({ item: region }) => (
          <TouchableOpacity
            style={[
              styles.regionChip,
              selectedRegion === region && styles.regionChipActive,
            ]}
            onPress={() => setSelectedRegion(region)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.regionLabel,
                selectedRegion === region && styles.regionLabelActive,
              ]}
            >
              {region}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.resultCount}>
        {filteredFlags.length} flag{filteredFlags.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={filteredFlags}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  },
  searchInput: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionScroll: {
    maxHeight: 48,
    marginTop: spacing.md,
  },
  regionList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  regionChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  regionChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.surfaceSecondary,
  },
  regionLabel: {
    ...typography.captionBold,
    color: colors.text,
  },
  regionLabelActive: {
    color: colors.ink,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
