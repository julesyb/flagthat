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
import { colors, spacing, borderRadius, typography, shadows } from '../utils/theme';
import { FlagCategory, FlagItem, CATEGORY_LABELS } from '../types';
import { getAllFlags } from '../data';

export default function BrowseScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FlagCategory | 'all'>('all');

  const allFlags = useMemo(() => getAllFlags(), []);

  const filteredFlags = useMemo(() => {
    let flags = allFlags;
    if (selectedCategory !== 'all') {
      flags = flags.filter((f) => f.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      flags = flags.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.region && f.region.toLowerCase().includes(q)),
      );
    }
    return flags.sort((a, b) => a.name.localeCompare(b.name));
  }, [allFlags, selectedCategory, searchQuery]);

  const categories: (FlagCategory | 'all')[] = ['all', ...(Object.keys(CATEGORY_LABELS) as FlagCategory[])];

  const renderItem = ({ item }: { item: FlagItem }) => (
    <View style={styles.flagItem}>
      <Text style={styles.flagEmoji}>{item.emoji}</Text>
      <View style={styles.flagInfo}>
        <Text style={styles.flagName}>{item.name}</Text>
        {item.region && (
          <Text style={styles.flagRegion}>{item.region}</Text>
        )}
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
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        style={styles.categoryScroll}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat && styles.categoryLabelActive,
              ]}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    ...shadows.small,
  },
  categoryScroll: {
    maxHeight: 48,
    marginTop: spacing.md,
  },
  categoryList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  categoryLabel: {
    ...typography.captionBold,
    color: colors.text,
  },
  categoryLabelActive: {
    color: colors.accent,
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  flagEmoji: {
    fontSize: 36,
    marginRight: spacing.md,
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
    marginTop: 2,
  },
});
