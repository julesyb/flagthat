import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, spacing, borderRadius, typography, buildButtons } from '../utils/theme';
import { t } from '../utils/i18n';
import { hapticTap } from '../utils/feedback';
import { hasKeyboardWeb, swipesEnabled } from '../utils/webInput';
import { isShortcutsHelpOpen, setShortcutsHelpOpen, subscribeShortcutsHelp } from '../utils/shortcutsHelp';

/** A key cap: a translation key for named keys, or the literal text for symbols. */
type KeyCap = { labelKey: string } | { text: string };

interface Row {
  keys: KeyCap[];
  labelKey: string;
}

const KEYBOARD_ROWS: Row[] = [
  { keys: [{ text: '1-4' }, { text: 'A-D' }], labelKey: 'shortcuts.pickAnswer' },
  { keys: [{ labelKey: 'shortcuts.keyEnter' }, { labelKey: 'shortcuts.keySpace' }], labelKey: 'shortcuts.continue' },
  { keys: [{ labelKey: 'shortcuts.keyEsc' }], labelKey: 'shortcuts.exitBack' },
  { keys: [{ text: '←' }, { text: '→' }], labelKey: 'shortcuts.switchTabs' },
  { keys: [{ text: '↑' }, { text: '↓' }], labelKey: 'shortcuts.moveAnswers' },
  { keys: [{ text: '?' }], labelKey: 'shortcuts.showHelp' },
];

const TOUCH_ROWS: Row[] = [
  { keys: [{ labelKey: 'shortcuts.swipeSides' }], labelKey: 'shortcuts.switchTabs' },
  { keys: [{ labelKey: 'shortcuts.swipeLeft' }], labelKey: 'shortcuts.nextQuestion' },
  { keys: [{ labelKey: 'shortcuts.swipeDown' }], labelKey: 'shortcuts.closeTip' },
  { keys: [{ labelKey: 'shortcuts.swipeEdge' }], labelKey: 'shortcuts.goBack' },
];

/** Whether this device has anything for the sheet to list. */
export function hasShortcutsToShow(): boolean {
  return hasKeyboardWeb() || swipesEnabled();
}

/**
 * Sheet listing keyboard shortcuts (web with a keyboard) and touch gestures
 * (touch screens). Mounted once at the app root; open it with '?' or from Settings.
 */
export default function ShortcutsHelp() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const btn = useMemo(() => buildButtons(colors), [colors]);
  const [open, setOpen] = useState(isShortcutsHelpOpen());

  useEffect(() => subscribeShortcutsHelp(setOpen), []);

  const sections = useMemo(
    () => [
      hasKeyboardWeb() && { titleKey: 'shortcuts.keyboard', rows: KEYBOARD_ROWS },
      swipesEnabled() && { titleKey: 'shortcuts.touch', rows: TOUCH_ROWS },
    ].filter((s): s is { titleKey: string; rows: Row[] } => !!s),
    [],
  );

  const close = () => {
    hapticTap();
    setShortcutsHelpOpen(false);
  };

  const capLabel = (cap: KeyCap) => ('labelKey' in cap ? t(cap.labelKey) : cap.text);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('common.closeDialog')}
      >
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title} accessibilityRole="header">{t('shortcuts.title')}</Text>
            {sections.map((section) => (
              <View key={section.titleKey} style={styles.section}>
                <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>
                {section.rows.map((row) => (
                  <View
                    key={row.labelKey + row.keys.map(capLabel).join()}
                    style={styles.row}
                    accessible
                    accessibilityLabel={`${row.keys.map(capLabel).join(', ')}: ${t(row.labelKey)}`}
                  >
                    <View style={styles.caps}>
                      {row.keys.map((cap) => (
                        <View key={capLabel(cap)} style={styles.cap}>
                          <Text style={styles.capText}>{capLabel(cap)}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.rowLabel}>{t(row.labelKey)}</Text>
                  </View>
                ))}
              </View>
            ))}
            <TouchableOpacity
              style={[btn.secondary, styles.closeBtn]}
              onPress={close}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('shortcuts.close')}
            >
              <Text style={btn.secondaryText}>{t('shortcuts.close')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
      maxWidth: 420,
      maxHeight: '90%',
    },
    content: {
      padding: spacing.lg,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    section: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.eyebrow,
      color: colors.textTertiary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    caps: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      width: 140,
    },
    cap: {
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    capText: {
      ...typography.captionStrong,
      color: colors.text,
    },
    rowLabel: {
      ...typography.body,
      color: colors.textSecondary,
      flex: 1,
    },
    closeBtn: {
      marginTop: spacing.lg,
    },
  });
