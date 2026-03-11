import { UserStats } from '../types';
import { FlagStats } from './storage';
import { getTotalFlagCount } from '../data';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type BadgeIcon = 'flag' | 'globe' | 'check' | 'play' | 'lightning' | 'calendar' | 'clock' | 'crosshair' | 'link' | 'eye' | 'heart';

export interface Badge {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: 'progression' | 'accuracy' | 'streak' | 'mode' | 'category' | 'fun';
  icon: BadgeIcon;
}

export interface EarnedBadge extends Badge {
  earned: true;
}

export const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: '#A0612A',
  silver: '#888888',
  gold: '#C9960C',
  platinum: '#6366F1',
};

export const BADGES: Badge[] = [
  // ── Progression
  { id: 'first_flag', name: 'First Flag', description: 'Complete your first game', tier: 'bronze', category: 'progression', icon: 'flag' },
  { id: 'globe_trotter', name: 'Globe Trotter', description: 'Identify 50 unique flags', tier: 'silver', category: 'progression', icon: 'globe' },
  { id: 'world_citizen', name: 'World Citizen', description: 'Identify 100 unique flags', tier: 'gold', category: 'progression', icon: 'globe' },
  { id: 'flag_master', name: 'Flag Master', description: 'Identify all flags at least once', tier: 'platinum', category: 'progression', icon: 'flag' },
  { id: 'ten_timer', name: 'Ten-Timer', description: 'Play 10 games', tier: 'bronze', category: 'progression', icon: 'play' },
  { id: 'century_club', name: 'Century Club', description: 'Play 100 games', tier: 'gold', category: 'progression', icon: 'play' },

  // ── Accuracy
  { id: 'perfect_10', name: 'Perfect 10', description: 'Score 10/10 on any game', tier: 'gold', category: 'accuracy', icon: 'check' },
  { id: 's_rank', name: 'S-Rank', description: 'Earn 95%+ accuracy in a game', tier: 'silver', category: 'accuracy', icon: 'lightning' },

  // ── Streak
  { id: 'hot_streak', name: 'Hot Streak', description: '10 correct in a row', tier: 'bronze', category: 'streak', icon: 'lightning' },
  { id: 'on_fire', name: 'On Fire', description: '25 correct in a row', tier: 'silver', category: 'streak', icon: 'lightning' },
  { id: 'unstoppable', name: 'Unstoppable', description: '50 correct in a row', tier: 'gold', category: 'streak', icon: 'lightning' },
  { id: 'day_tripper', name: 'Day Tripper', description: '3-day play streak', tier: 'bronze', category: 'streak', icon: 'calendar' },
  { id: 'week_warrior', name: 'Week Warrior', description: '7-day play streak', tier: 'silver', category: 'streak', icon: 'calendar' },
  { id: 'month_master', name: 'Month Master', description: '30-day play streak', tier: 'gold', category: 'streak', icon: 'calendar' },

  // ── Mode-specific
  { id: 'speed_demon', name: 'Speed Demon', description: '15+ in Timed Quiz', tier: 'silver', category: 'mode', icon: 'clock' },
  { id: 'lightning_round', name: 'Lightning Round', description: '25+ in Timed Quiz', tier: 'gold', category: 'mode', icon: 'clock' },
  { id: 'daily_devotee', name: 'Daily Devotee', description: 'Complete 7 daily challenges', tier: 'silver', category: 'mode', icon: 'calendar' },
  { id: 'daily_legend', name: 'Daily Legend', description: 'Complete 30 daily challenges', tier: 'gold', category: 'mode', icon: 'calendar' },

  // ── Fun/Hidden
  { id: 'practice_perfect', name: 'Practice Perfect', description: 'Clear all flags from practice', tier: 'gold', category: 'fun', icon: 'crosshair' },
  { id: 'shared_spirit', name: 'Shared Spirit', description: 'Share your results', tier: 'bronze', category: 'fun', icon: 'link' },
  { id: 'supporter', name: 'Supporter', description: 'Support by watching a video', tier: 'bronze', category: 'fun', icon: 'heart' },
];

export interface BadgeCheckContext {
  stats: UserStats;
  flagStats: FlagStats;
  dayStreak: number;
  dailyChallengesCompleted: number;
  hasShared: boolean;
  lastGamePerfect10: boolean;
  lastGameSRank: boolean;
  weakFlagCount: number;
  adsWatched: number;
}

export interface BadgeProgress {
  progress: number;
  target: number;
  pct: number; // 0-100
}

// Returns progress toward a badge (null if not trackable or already earned)
export function getBadgeProgress(badge: Badge, ctx: BadgeCheckContext): BadgeProgress | null {
  const totalFlags = getTotalFlagCount();
  const countriesSeen = Object.values(ctx.flagStats).filter((s) => s.right > 0).length;

  let progress = 0;
  let target = 0;

  switch (badge.id) {
    case 'first_flag': progress = ctx.stats.totalGamesPlayed; target = 1; break;
    case 'globe_trotter': progress = countriesSeen; target = 50; break;
    case 'world_citizen': progress = countriesSeen; target = 100; break;
    case 'flag_master': progress = countriesSeen; target = totalFlags; break;
    case 'ten_timer': progress = ctx.stats.totalGamesPlayed; target = 10; break;
    case 'century_club': progress = ctx.stats.totalGamesPlayed; target = 100; break;
    case 'hot_streak': progress = ctx.stats.bestStreak; target = 10; break;
    case 'on_fire': progress = ctx.stats.bestStreak; target = 25; break;
    case 'unstoppable': progress = ctx.stats.bestStreak; target = 50; break;
    case 'day_tripper': progress = ctx.dayStreak; target = 3; break;
    case 'week_warrior': progress = ctx.dayStreak; target = 7; break;
    case 'month_master': progress = ctx.dayStreak; target = 30; break;
    case 'speed_demon': progress = ctx.stats.bestTimeAttackScore || 0; target = 15; break;
    case 'lightning_round': progress = ctx.stats.bestTimeAttackScore || 0; target = 25; break;
    case 'daily_devotee': progress = ctx.dailyChallengesCompleted; target = 7; break;
    case 'daily_legend': progress = ctx.dailyChallengesCompleted; target = 30; break;
    default: return null;
  }

  if (target === 0) return null;
  const clamped = Math.min(progress, target);
  return { progress: clamped, target, pct: Math.round((clamped / target) * 100) };
}

export function evaluateBadges(ctx: BadgeCheckContext): EarnedBadge[] {
  const earned: EarnedBadge[] = [];
  const totalFlags = getTotalFlagCount();
  const countriesSeen = Object.values(ctx.flagStats).filter((s) => s.right > 0).length;

  const check = (id: string, condition: boolean) => {
    if (condition) {
      const badge = BADGES.find((b) => b.id === id);
      if (badge) earned.push({ ...badge, earned: true });
    }
  };

  // Progression
  check('first_flag', ctx.stats.totalGamesPlayed >= 1);
  check('globe_trotter', countriesSeen >= 50);
  check('world_citizen', countriesSeen >= 100);
  check('flag_master', countriesSeen >= totalFlags);
  check('ten_timer', ctx.stats.totalGamesPlayed >= 10);
  check('century_club', ctx.stats.totalGamesPlayed >= 100);

  // Accuracy
  check('perfect_10', ctx.lastGamePerfect10);
  check('s_rank', ctx.lastGameSRank);

  // Streaks
  check('hot_streak', ctx.stats.bestStreak >= 10);
  check('on_fire', ctx.stats.bestStreak >= 25);
  check('unstoppable', ctx.stats.bestStreak >= 50);
  check('day_tripper', ctx.dayStreak >= 3);
  check('week_warrior', ctx.dayStreak >= 7);
  check('month_master', ctx.dayStreak >= 30);

  // Mode
  check('speed_demon', (ctx.stats.bestTimeAttackScore || 0) >= 15);
  check('lightning_round', (ctx.stats.bestTimeAttackScore || 0) >= 25);
  check('daily_devotee', ctx.dailyChallengesCompleted >= 7);
  check('daily_legend', ctx.dailyChallengesCompleted >= 30);

  // Fun
  check('practice_perfect', countriesSeen > 0 && ctx.weakFlagCount === 0 && ctx.stats.totalGamesPlayed >= 5);
  check('shared_spirit', ctx.hasShared);
  check('supporter', ctx.adsWatched > 0);

  return earned;
}
