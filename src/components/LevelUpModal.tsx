import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { ThemeColors, spacing, fontFamily, borderRadius, typography } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';
import { getTierLabel, getLevelTier } from '../utils/levels';

/** Celebration popover shown when the player crosses into a new level. */
export default function LevelUpModal({
  level,
  onClose,
}: {
  level: number | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={level !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.closeDialog')}
      >
        <TouchableOpacity activeOpacity={1} style={styles.levelUpCard} onPress={() => {}}>
          <Text style={styles.levelUpTitle}>{t('stats.levelUp')}</Text>
          <Text style={styles.levelUpNumber}>{level}</Text>
          <Text style={styles.levelUpTier}>{getTierLabel(getLevelTier(level ?? 1))}</Text>
          <Text style={styles.levelUpDesc}>{t('stats.levelReached', { level: level ?? 1 })}</Text>
          <TouchableOpacity
            style={styles.levelUpButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.next')}
          >
            <Text style={styles.levelUpButtonText}>{t('common.next')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  levelUpCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 320,
    alignItems: 'center', borderWidth: 2, borderColor: colors.goldBright,
  },
  levelUpTitle: {
    ...typography.eyebrow, color: colors.goldBright,
    letterSpacing: 1.5, marginBottom: spacing.sm,
  },
  levelUpNumber: {
    fontFamily: fontFamily.display, fontSize: 56,
    color: colors.goldBright, lineHeight: 64,
  },
  levelUpTier: {
    ...typography.bodyBold, color: colors.textSecondary,
    marginTop: spacing.xxs, marginBottom: spacing.md,
  },
  levelUpDesc: {
    ...typography.body, color: colors.text,
    textAlign: 'center', marginBottom: spacing.lg,
  },
  levelUpButton: {
    paddingVertical: 14, paddingHorizontal: spacing.xxl,
    alignItems: 'center', borderRadius: borderRadius.md,
    backgroundColor: colors.goldBright,
  },
  levelUpButtonText: {
    ...typography.actionLabel, color: colors.playText,
  },
});
