// ---- App configuration constants ----
export const APP_DOMAIN = 'flagthat.app';
export const APP_URL = `https://${APP_DOMAIN}`;

// ---- Game constants ----
export const MS_PER_DAY = 86400000;
export const DAILY_QUESTION_COUNT = 10;
export const DAILY_LEADERBOARD_MAX_AGE_DAYS = 7;
export const SHARE_GRID_ROW_SIZE = 5;
export const EASY_CHOICE_COUNT = 2;
export const STANDARD_CHOICE_COUNT = 4;
export const MASTERED_STREAK = 3;
export const UNLOCK_THRESHOLD = 3;
export const MAX_GAME_HISTORY = 50;
export const MAX_CHALLENGE_HISTORY = 10;

// ---- Challenge constants ----
export const MAX_CHALLENGE_FLAGS = 30;
export const MAX_CHALLENGE_NAME_LENGTH = 15;
export const MAX_HOSTNAME_LENGTH = 50;
export const SHORT_CODE_LENGTH = 6;
export const SPEED_FAST_MS = 2000;
export const SPEED_MEDIUM_MS = 5000;

// ---- Home screen quick-play presets ----
export const HOME_QUESTION_COUNTS = [5, 10, 15, 20] as const;

// ---- GameSetup screen presets ----
export const SETUP_QUESTION_COUNTS = [10, 20, 50, 100] as const;
export const FLAGPUZZLE_TIMES = [15, 30, 60] as const;
export const TIMEATTACK_TIMES = [30, 60, 90, 120] as const;
export const DEFAULT_GUESS_LIMIT = 3;
export const GUESS_LIMIT_OPTIONS = [3, 5, 0] as const; // 0 = unlimited

// ---- Default mode configs ----
export const UNLIMITED_QUESTIONS = 999; // sentinel: generate as many as the pool allows
export const TIMEATTACK_DEFAULT_TIME = 60;

// ---- UI thresholds ----
export const GOOD_ACCURACY_PCT = 70;
export const STATS_WEAK_FLAGS_LIMIT = 10;
