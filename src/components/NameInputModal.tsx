import React, { useMemo } from 'react';
import { Modal, TouchableOpacity, TextInput, Text, StyleSheet, Keyboard, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { spacing, typography, borderRadius, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { MAX_CHALLENGE_NAME_LENGTH } from '../utils/config';
import { isNameBlocked } from '../utils/nameFilter';
import { t } from '../utils/i18n';

interface Props {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  title: string;
  onSubmit: () => void;
  onClose: () => void;
}

export default function NameInputModal({ visible, value, onChangeText, title, onSubmit, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const canSubmit = value.trim().length > 0;

  const handleSubmit = () => {
    if (isNameBlocked(value)) {
      Alert.alert(t('challenge.nameBlockedTitle'), t('challenge.nameBlockedDesc'));
      return;
    }
    onSubmit();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.closeDialog')}
        >
          <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{title}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChangeText}
              placeholder={t('challenge.namePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={MAX_CHALLENGE_NAME_LENGTH}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={canSubmit ? () => { Keyboard.dismiss(); handleSubmit(); } : undefined}
              accessibilityLabel={title}
            />
            <TouchableOpacity
              style={[styles.shareBtn, !canSubmit && styles.shareBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.share')}
              accessibilityState={{ disabled: !canSubmit }}
            >
              <Text style={styles.shareBtnText}>{t('common.share')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 360,
  },
  title: {
    ...typography.bodyBold,
    color: colors.ink, textAlign: 'center', marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md,
    ...typography.body,
    color: colors.text, textAlign: 'center', marginBottom: spacing.md,
  },
  shareBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderRadius: borderRadius.md, backgroundColor: colors.goldBright,
  },
  shareBtnDisabled: { backgroundColor: colors.textTertiary },
  shareBtnText: {
    ...typography.actionLabel, color: colors.playText,
  },
});
