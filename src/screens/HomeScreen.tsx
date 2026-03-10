import React, { useEffect, useState } from 'react';
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
import { colors, spacing, fontFamily, borderRadius } from '../utils/theme';
import { getTotalFlagCount } from '../data';
import { initAudio, hapticTap } from '../utils/feedback';
import { getStats } from '../utils/storage';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const totalFlags = getTotalFlagCount();
  const [mastered, setMastered] = useState(0);

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getStats().then((stats) => {
        setMastered(stats.totalCorrect);
      });
    });
    return unsubscribe;
  }, [navigation]);

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
        {/* LOGO */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>F</Text>
          </View>
          <View style={styles.logoTextRow}>
            <Text style={styles.logoFlags}>Flags</Text>
            <Text style={styles.logoAreUs}>Are Us</Text>
          </View>
          <Text style={styles.subtitle}>{totalFlags} flags to master</Text>
        </View>

        {/* CARDS */}
        <View style={styles.cardsContainer}>
          {/* Quick Play */}
          <TouchableOpacity
            style={styles.cardQuickPlay}
            onPress={quickPlay}
            activeOpacity={0.85}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconCircleLight}>
                <Text style={styles.iconTextWhite}>Q</Text>
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.cardTitleWhite}>Quick Play</Text>
                <Text style={styles.cardSubWhite}>10 famous flags, 50/50</Text>
              </View>
            </View>
            <Text style={styles.arrowWhite}>{'\u2192'}</Text>
          </TouchableOpacity>

          {/* Custom Game */}
          <TouchableOpacity
            style={styles.cardDark}
            onPress={() => { hapticTap(); navigation.navigate('GameSetup'); }}
            activeOpacity={0.85}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconCircleDark}>
                <Text style={styles.iconTextLight}>+</Text>
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.cardTitleWhite}>Custom Game</Text>
                <Text style={styles.cardSubLight}>Choose mode, category & more</Text>
              </View>
            </View>
            <Text style={styles.arrowLight}>{'\u2192'}</Text>
          </TouchableOpacity>

          {/* Statistics */}
          <TouchableOpacity
            style={styles.cardLight}
            onPress={() => { hapticTap(); navigation.navigate('Stats'); }}
            activeOpacity={0.85}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconCircleGray}>
                <Text style={styles.iconTextDark}>#</Text>
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.cardTitleDark}>Statistics</Text>
                <Text style={styles.cardSubDark}>Track your progress</Text>
              </View>
            </View>
            <Text style={styles.arrowGray}>{'\u2192'}</Text>
          </TouchableOpacity>

          {/* Browse Flags */}
          <TouchableOpacity
            style={styles.cardLight}
            onPress={() => { hapticTap(); navigation.navigate('Browse'); }}
            activeOpacity={0.85}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconCircleGray}>
                <Text style={styles.iconTextDark}>{'\u2261'}</Text>
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.cardTitleDark}>Browse Flags</Text>
                <Text style={styles.cardSubDark}>Explore all {totalFlags} flags</Text>
              </View>
            </View>
            <Text style={styles.arrowGray}>{'\u2192'}</Text>
          </TouchableOpacity>
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
    paddingBottom: spacing.xxl + spacing.xl,
  },

  // LOGO
  logoSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoIconText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 32,
    color: colors.white,
  },
  logoTextRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoFlags: {
    fontFamily: fontFamily.display,
    fontSize: 42,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  logoAreUs: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 42,
    color: colors.accent,
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textSecondary,
  },

  // CARDS
  cardsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },

  // Quick Play card (orange)
  cardQuickPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  // Dark card (Custom Game)
  cardDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  // Light card (Statistics, Browse)
  cardLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  cardTextGroup: {
    flex: 1,
  },

  // Icon circles
  iconCircleLight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleGray: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Icon text
  iconTextWhite: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 16,
    color: colors.white,
  },
  iconTextLight: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  iconTextDark: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Card titles
  cardTitleWhite: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 18,
    color: colors.white,
    marginBottom: spacing.xxs,
  },
  cardTitleDark: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 18,
    color: colors.ink,
    marginBottom: spacing.xxs,
  },

  // Card subtitles
  cardSubWhite: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  cardSubLight: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  cardSubDark: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Arrows
  arrowWhite: {
    fontFamily: fontFamily.body,
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
  },
  arrowLight: {
    fontFamily: fontFamily.body,
    fontSize: 20,
    color: 'rgba(255,255,255,0.35)',
  },
  arrowGray: {
    fontFamily: fontFamily.body,
    fontSize: 20,
    color: colors.rule2,
  },
});
