import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ThemeColors, spacing, fontSize, borderRadius, typography } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../utils/i18n';
import { ChallengeHistoryEntry } from '../utils/storage';
import {
  getBadgeProgress,
  getBadgeName,
  getBadgeDescription,
  TIER_COLORS,
  Badge,
  BadgeCheckContext,
  deriveFromContext,
} from '../utils/badges';
import { BadgeIconView, CheckIcon, CrossIcon, CopyIcon } from './Icons';
import { hapticTap } from '../utils/feedback';
import { decodeChallenge } from '../utils/challengeCode';
import { modeLabelKey } from '../utils/gameEngine';

type DerivedCtx = ReturnType<typeof deriveFromContext>;

// A challenge history row augmented with the opponent display fields the stats
// screen resolves before handing it to the head-to-head modal.
export type ChallengeDisplayRow = ChallengeHistoryEntry & {
  displayOpponentName: string | null;
  displayOpponentScore: number | null;
  displayOpponentResults?: boolean[];
};

/** Badge detail popover: icon, name, description, and earned/progress/locked state. */
export function BadgeDetailModal({
  badge,
  onClose,
  earnedBadges,
  badgeCtx,
  derived,
}: {
  badge: Badge | null;
  onClose: () => void;
  earnedBadges: Badge[];
  badgeCtx: BadgeCheckContext | null;
  derived: DerivedCtx | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={badge !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          {badge && (() => {
            const isEarned = earnedBadges.some((b) => b.id === badge.id);
            const tierColor = TIER_COLORS[badge.tier];
            const bp = !isEarned && badgeCtx && derived ? getBadgeProgress(badge, badgeCtx, derived) : null;
            const inProgress = bp && bp.progress > 0;
            return (
              <>
                <View style={[styles.modalBadgeIcon, { backgroundColor: tierColor + '18' }]}>
                  <BadgeIconView icon={badge.icon} size={28} color={isEarned ? tierColor : colors.textTertiary} />
                </View>
                <Text style={styles.modalBadgeName}>{getBadgeName(badge)}</Text>
                <Text style={styles.modalBadgeDesc}>{getBadgeDescription(badge)}</Text>
                <View style={[styles.modalStatusPill, {
                  backgroundColor: isEarned ? colors.successBg : inProgress ? colors.warningBg : colors.surfaceSecondary,
                }]}>
                  <Text style={[styles.modalStatusText, {
                    color: isEarned ? colors.success : inProgress ? colors.warning : colors.textTertiary,
                  }]}>
                    {isEarned
                      ? t('stats.badgeDetailEarned')
                      : inProgress
                      ? t('stats.badgeDetailProgress', { progress: bp!.progress, target: bp!.target })
                      : t('stats.badgeDetailLocked')}
                  </Text>
                </View>
                {inProgress && (
                  <View style={styles.modalProgressWrap}>
                    <View style={[styles.modalProgressFill, { width: `${bp!.pct}%` }]} />
                  </View>
                )}
              </>
            );
          })()}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/** Head-to-head challenge detail popover with per-question results and code copy. */
export function ChallengeDetailModal({
  challenge,
  onClose,
}: {
  challenge: ChallengeDisplayRow | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [codeCopied, setCodeCopied] = useState(false);

  // Reset the "copied" affordance whenever the modal is dismissed.
  useEffect(() => {
    if (!challenge) setCodeCopied(false);
  }, [challenge]);

  return (
    <Modal
      visible={challenge !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalCard, { maxHeight: '80%' }]} onStartShouldSetResponder={() => true}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {challenge && (() => {
            const ch = challenge;
            // Reconstruct myResults from fullCode if missing (older challenge data)
            let myResults = ch.myResults;
            if (!myResults && ch.fullCode && ch.direction === 'sent') {
              const decoded = decodeChallenge(ch.fullCode);
              if (decoded.status === 'ok') {
                myResults = decoded.data.hostResults.map((r) => r.correct);
              }
            }
            const hasOpponent = ch.displayOpponentName !== null && ch.displayOpponentScore !== null;
            const won = hasOpponent && ch.myScore > ch.displayOpponentScore!;
            const lost = hasOpponent && ch.myScore < ch.displayOpponentScore!;
            const tied = hasOpponent && ch.myScore === ch.displayOpponentScore!;
            const dateStr = new Date(ch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <>
                <Text style={styles.modalTitle}>{t('challenge.headToHead')}</Text>
                <Text style={[styles.modalSubtitle, { marginBottom: spacing.md }]}>{t(modeLabelKey(ch.mode))} - {dateStr}</Text>

                {hasOpponent ? (
                  <View style={styles.h2hContainer}>
                    <View style={styles.h2hColumn}>
                      <Text style={styles.h2hName}>{ch.myName || t('challenge.you')}</Text>
                      <Text style={[styles.h2hScore, won && { color: colors.success }]}>{ch.myScore}/{ch.totalFlags}</Text>
                    </View>
                    <Text style={styles.h2hVs}>{t('common.vs')}</Text>
                    <View style={styles.h2hColumn}>
                      <Text style={styles.h2hName}>{ch.displayOpponentName}</Text>
                      <Text style={[styles.h2hScore, lost && { color: colors.error }]}>{ch.displayOpponentScore}/{ch.totalFlags}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.h2hContainer}>
                    <View style={styles.h2hColumn}>
                      <Text style={styles.h2hName}>{ch.myName || t('challenge.you')}</Text>
                      <Text style={styles.h2hScore}>{ch.myScore}/{ch.totalFlags}</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.modalStatusPill, {
                  backgroundColor: won ? colors.successBg : lost ? colors.errorBg : colors.surfaceSecondary,
                  marginTop: spacing.md,
                }]}>
                  <Text style={[styles.modalStatusText, {
                    color: won ? colors.success : lost ? colors.error : colors.textTertiary,
                  }]}>
                    {won ? t('challenge.youWin')
                      : lost ? t('challenge.theyWin', { name: ch.displayOpponentName || '' })
                      : tied ? t('challenge.tie')
                      : `${ch.myScore}/${ch.totalFlags}`}
                  </Text>
                </View>

                {/* Per-question result details */}
                {(myResults || ch.displayOpponentResults) && (
                  <View style={styles.h2hDetailsWrap}>
                    <View style={styles.h2hDetailsHeader}>
                      <Text style={[styles.h2hDetailsLabel, { flex: hasOpponent ? 1 : 0 }]}>{ch.myName || t('challenge.you')}</Text>
                      <Text style={[styles.h2hDetailsLabel, { width: 28, textAlign: 'center' }]}>#</Text>
                      {hasOpponent && <Text style={[styles.h2hDetailsLabel, { flex: 1, textAlign: 'right' }]}>{ch.displayOpponentName}</Text>}
                    </View>
                    {Array.from({ length: ch.totalFlags }).map((_, qi) => {
                      const myOk = myResults ? myResults[qi] : undefined;
                      const oppOk = ch.displayOpponentResults ? ch.displayOpponentResults[qi] : undefined;
                      const myWon = myOk === true && oppOk === false;
                      const oppWon = oppOk === true && myOk === false;
                      return (
                        <View key={qi} style={[styles.h2hDetailsRow, qi % 2 === 0 && { backgroundColor: colors.surfaceSecondary + '40' }]}>
                          <View style={hasOpponent ? styles.h2hDetailsSide : undefined}>
                            {myOk === undefined ? (
                              <View style={[styles.h2hDot, { backgroundColor: colors.surfaceSecondary }]} />
                            ) : myOk ? (
                              <CheckIcon size={14} color={myWon ? colors.success : colors.success + '90'} />
                            ) : (
                              <CrossIcon size={14} color={colors.error + (oppWon ? 'FF' : '90')} />
                            )}
                          </View>
                          <Text style={styles.h2hDetailsQ}>{qi + 1}</Text>
                          {hasOpponent && (
                            <View style={[styles.h2hDetailsSide, { alignItems: 'flex-end' }]}>
                              {oppOk === undefined ? (
                                <View style={[styles.h2hDot, { backgroundColor: colors.surfaceSecondary }]} />
                              ) : oppOk ? (
                                <CheckIcon size={14} color={oppWon ? colors.success : colors.success + '90'} />
                              ) : (
                                <CrossIcon size={14} color={colors.error + (myWon ? 'FF' : '90')} />
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {ch.fullCode ? (
                  <TouchableOpacity
                    style={[styles.copyCodeBtn, codeCopied && styles.copyCodeBtnCopied]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('challenge.copyCode')}
                    onPress={async () => {
                      hapticTap();
                      try {
                        await Clipboard.setStringAsync(ch.fullCode);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      } catch { /* clipboard unavailable on some platforms */ }
                    }}
                  >
                    {codeCopied ? (
                      <CheckIcon size={14} color={colors.success} />
                    ) : (
                      <CopyIcon size={14} color={colors.textSecondary} />
                    )}
                    <Text style={[styles.copyCodeText, codeCopied && styles.copyCodeTextCopied]}>
                      {codeCopied ? t('challenge.codeCopied') : t('challenge.copyCode')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            );
          })()}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.title,
    color: colors.ink,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  modalBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalBadgeName: {
    ...typography.bodyBold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalBadgeDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalStatusPill: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalStatusText: {
    ...typography.captionStrong,
    textAlign: 'center',
  },
  modalProgressWrap: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    width: '100%',
    marginTop: spacing.sm,
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
  },

  // ── Head to Head
  h2hContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  h2hColumn: {
    flex: 1,
    alignItems: 'center',
  },
  h2hName: {
    ...typography.captionStrong,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  h2hScore: {
    ...typography.statValue,
    color: colors.ink,
    fontSize: fontSize.lg,
  },
  h2hVs: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  h2hDetailsWrap: {
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  h2hDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  h2hDetailsLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  h2hDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  h2hDetailsSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  h2hDetailsQ: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    width: 28,
  },
  h2hDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  copyCodeText: {
    ...typography.captionStrong,
    color: colors.textSecondary,
  },
  copyCodeBtnCopied: {
    backgroundColor: colors.successBg,
  },
  copyCodeTextCopied: {
    color: colors.success,
  },
});
