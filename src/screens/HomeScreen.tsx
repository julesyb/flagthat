import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, fontFamily } from '../utils/theme';
import { getTotalFlagCount, getAllFlags } from '../data';
import { initAudio, hapticTap } from '../utils/feedback';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const totalFlags = getTotalFlagCount();

  const regionCounts = useMemo(() => {
    const flags = getAllFlags();
    const counts: Record<string, number> = {};
    for (const flag of flags) {
      counts[flag.region] = (counts[flag.region] || 0) + 1;
    }
    return counts;
  }, []);

  useEffect(() => {
    initAudio();
  }, []);

  const quickPlay = () => {
    hapticTap();
    navigation.navigate('Game', {
      config: { mode: 'easy', category: 'easy_flags', questionCount: 10 },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopRule} />
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.eyebrow}>
                Flag Identification  {'\u00B7'}  {totalFlags} Countries
              </Text>
              <Text style={styles.logotypeMain}>Flags</Text>
              <Text style={styles.logotypeItalic}>Are Us</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.countNumber}>{totalFlags}</Text>
              <Text style={styles.countLabel}>Countries</Text>
            </View>
          </View>
        </View>

        {/* BYLINE */}
        <View style={styles.byline}>
          <Text style={styles.bylineText}>
            Geography  {'\u00B7'}  Cartography  {'\u00B7'}  Mastery
          </Text>
          <View style={styles.bylineDots}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.bylineDot} />
            ))}
          </View>
        </View>

        {/* PLAY SECTION */}
        <View style={styles.cardsSection}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Play</Text>
            <View style={styles.sectionRule} />
          </View>

          {/* Hero Card — Quick Play */}
          <TouchableOpacity
            style={styles.cardHero}
            onPress={quickPlay}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeroBar} />
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <Text style={styles.heroIconText}>Q</Text>
              </View>
              <View>
                <Text style={styles.heroTitle}>Quick Play</Text>
                <Text style={styles.heroSub}>
                  10 famous flags  {'\u00B7'}  50 / 50
                </Text>
              </View>
            </View>
            <Text style={styles.heroArrow}>{'\u2192'}</Text>
          </TouchableOpacity>

          {/* Standard Card — Custom Game */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => { hapticTap(); navigation.navigate('GameSetup'); }}
            activeOpacity={0.85}
          >
            <View style={styles.cardLeft}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>+</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Custom Game</Text>
                <Text style={styles.cardSub}>Choose mode, category & more</Text>
              </View>
            </View>
            <Text style={styles.cardArrow}>{'\u2192'}</Text>
          </TouchableOpacity>
        </View>

        {/* EXPLORE SECTION */}
        <View style={styles.cardsSection}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Explore</Text>
            <View style={styles.sectionRule} />
          </View>

          <TouchableOpacity
            style={styles.card}
            onPress={() => { hapticTap(); navigation.navigate('Stats'); }}
            activeOpacity={0.85}
          >
            <View style={styles.cardLeft}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>#</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Statistics</Text>
                <Text style={styles.cardSub}>Track your progress</Text>
              </View>
            </View>
            <Text style={styles.cardArrow}>{'\u2192'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => { hapticTap(); navigation.navigate('Browse'); }}
            activeOpacity={0.85}
          >
            <View style={styles.cardLeft}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>{'\u2261'}</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Browse Flags</Text>
                <Text style={styles.cardSub}>Explore all {totalFlags} flags</Text>
              </View>
            </View>
            <Text style={styles.cardArrow}>{'\u2192'}</Text>
          </TouchableOpacity>
        </View>

        {/* REGION INDEX */}
        <View style={styles.regionIndex}>
          <Text style={styles.regionIndexHead}>Browse by Region</Text>
          <View style={styles.regionList}>
            {Object.entries(regionCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([region, count]) => (
                <TouchableOpacity
                  key={region}
                  style={styles.regionItem}
                  onPress={() => { hapticTap(); navigation.navigate('Browse'); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.regionName}>{region}</Text>
                  <Text style={styles.regionCount}>{count}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
  },

  // HEADER
  header: {
    paddingTop: spacing.xxl,
    marginBottom: 0,
  },
  headerTopRule: {
    height: 3,
    backgroundColor: colors.accent,
    marginBottom: spacing.lg,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing.md + spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  logotypeMain: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    lineHeight: 52,
    color: colors.ink,
    letterSpacing: -1,
  },
  logotypeItalic: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 52,
    lineHeight: 52,
    color: colors.accent,
    letterSpacing: -1,
  },
  headerRight: {
    alignItems: 'flex-end',
    paddingBottom: spacing.xs,
  },
  countNumber: {
    ...typography.countNumber,
    color: colors.ink,
    lineHeight: 52,
  },
  countLabel: {
    ...typography.eyebrow,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // BYLINE
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xl,
  },
  bylineText: {
    ...typography.eyebrow,
    color: colors.textSecondary,
  },
  bylineDots: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  bylineDot: {
    width: 4,
    height: 4,
    backgroundColor: colors.rule2,
  },

  // SECTIONS
  cardsSection: {
    marginBottom: spacing.lg + spacing.xs,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
  },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.textSecondary,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  // HERO CARD
  cardHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    paddingVertical: spacing.lg + spacing.xs,
    paddingHorizontal: spacing.lg + spacing.sm,
    paddingLeft: spacing.lg + spacing.sm + 4,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  cardHeroBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.accent,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + spacing.xs,
    flex: 1,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 18,
    color: colors.white,
  },
  heroTitle: {
    ...typography.heroCardTitle,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.whiteAlpha45,
  },
  heroArrow: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 20,
    color: colors.whiteAlpha45,
  },

  // STANDARD CARD
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingVertical: spacing.md + spacing.xs,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  cardSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardArrow: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 16,
    color: colors.rule2,
  },

  // REGION INDEX
  regionIndex: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    marginTop: spacing.xl + spacing.md,
    paddingTop: spacing.md,
  },
  regionIndexHead: {
    ...typography.sectionLabel,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  regionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  regionItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  regionName: {
    fontFamily: fontFamily.uiLabelMedium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  regionCount: {
    fontFamily: fontFamily.uiLabelLight,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
