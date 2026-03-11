import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fontFamily } from '../utils/theme';

interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChipSelectorProps<T extends string | number> {
  label?: string;
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

export default function ChipSelector<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
}: ChipSelectorProps<T>) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${opt.label}${label ? `, ${label}` : ''}`}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {opt.label}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 9,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.slate,
  },
  chipTextActive: {
    color: colors.white,
  },
});
