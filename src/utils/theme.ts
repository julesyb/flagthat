// =====================
// BRAND GUIDELINES - Flag That
// Voice: Playful. Confident. Nostalgic-modern.
//
// Typography: Two font families only.
//   LibreBaskerville - display / editorial headings (Flag That wordmark, big numbers)
//   Barlow - everything else (body, labels, buttons, gameplay, UI)
//
// Rules:
// - Rounded corners on cards and interactive elements (sm-xl scale).
// - No gradients. Flat color planes.
// - No drop shadows except offset hard shadows on hover.
// - Gold is the primary CTA accent. Red reserved for errors and difficulty.
// - No emoji anywhere in the UI. Use SVG icons from Icons.tsx.
// - No em dashes in user-facing text. Use hyphens or commas.
//
// Palette: Warm-neutral (modern warmth meets clean polish).
//   Warm parchment backgrounds, midnight ink text,
//   gold CTA accent, green/red/blue/purple pops for variety.
// =====================

// Re-export config constants for backward compat
export { APP_DOMAIN, APP_URL } from './config';

// ---- Single source of truth for every color value ----
const palette = {
  ink: '#1A1820',         // Near-black warm ink (primary text)
  inkLight: '#2A2A45',    // Lighter midnight (secondary surfaces)
  inkSecondary: '#4A4558', // Warm slate (secondary text)
  gold: '#9A5C0A',        // Dark gold (CTA button on light bg, AA 5.0:1 on cream)
  goldBright: '#E9BA4C',  // Bright gold (accents, active indicators, streaks)
  goldShadow: '#5C3506',  // Deep gold (hard shadow on gold CTA)
  red: '#C43030',         // Warm red (errors, hard difficulty, AA 5.2:1 on cream)
  redLight: '#EC6666',    // Soft coral (dark-surface error text)
  muted: '#6E6878',       // Warm purple-grey (tertiary text, AA 4.5:1 on cream)
  dim: '#C8C2D4',         // Light lavender-grey (inactive elements, dividers)
  rule: '#E6DDD5',        // Warm rule line
  ruleDark: '#D6CCC3',    // Warmer rule (stronger emphasis)
  paper: '#F5EFE6',       // Warm parchment background
  paperDark: '#EDE6DC',   // Darker parchment (raised surfaces)
  white: '#FFFFFF',
  black: '#000000',
  green: '#1E8F56',       // Emerald green (success, easy difficulty, AA 4.6:1 on cream)
  greenBright: '#3DBF80', // Bright emerald (dark-surface success text)
  blue: '#4DA8E8',        // Sky blue (info accents)
  purple: '#A47FD4',      // Soft purple (mode accents, variety)
};

export const colors = {
  // Brand palette (direct access for commonly needed raw colors)
  ink: palette.ink,
  red: palette.red,
  rule: palette.rule,
  ruleDark: palette.ruleDark,
  white: palette.white,
  black: palette.black,
  gold: palette.gold,
  goldBright: palette.goldBright,
  purple: palette.purple,
  dim: palette.dim,

  // Semantic roles (all reference palette)
  primary: palette.ink,
  primaryLight: palette.inkLight,
  accent: palette.gold,
  accentLight: palette.goldBright,
  success: palette.green,
  error: palette.red,
  warning: palette.gold,
  background: palette.paper,
  surface: palette.white,
  surfaceSecondary: palette.paperDark,
  text: palette.ink,
  textSecondary: palette.inkSecondary,
  textTertiary: palette.muted,
  border: palette.rule,
  borderLight: palette.paperDark,
  shadow: 'rgba(26, 24, 32, 0.06)',
  overlay: 'rgba(26, 24, 32, 0.5)',
  inkAlpha10: 'rgba(26, 24, 32, 0.10)',

  // Grade colors (distinct per tier for visual differentiation)
  gradeS: palette.gold,
  gradeA: palette.green,
  gradeB: palette.blue,
  gradeC: palette.muted,
  gradeD: palette.red,
  gradeF: palette.ink,

  // Difficulty colors
  diffEasy: palette.green,
  diffMedium: palette.goldBright,
  diffHard: palette.red,
  diffEasyBg: 'rgba(30, 143, 86, 0.08)',
  diffEasyBorder: 'rgba(30, 143, 86, 0.25)',
  diffMediumBg: 'rgba(233, 186, 76, 0.12)',
  diffMediumBorder: 'rgba(233, 186, 76, 0.40)',
  diffHardBg: 'rgba(196, 48, 48, 0.08)',
  diffHardBorder: 'rgba(196, 48, 48, 0.25)',

  // Translucent helpers (for dark backgrounds)
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha45: 'rgba(255,255,255,0.45)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',

  // Dark surface feedback (on dark/navy backgrounds)
  darkSurface: 'rgba(255,255,255,0.07)',
  darkBorder: 'rgba(255,255,255,0.1)',
  successOnDark: 'rgba(61,191,128,0.10)',
  successBorderOnDark: 'rgba(61,191,128,0.30)',
  successTextOnDark: '#3DBF80',
  errorOnDark: 'rgba(236,102,102,0.10)',
  errorBorderOnDark: 'rgba(236,102,102,0.30)',
  errorTextOnDark: '#EC6666',

  // Light feedback backgrounds (on white/paper)
  successBg: 'rgba(30, 143, 86, 0.08)',
  errorBg: 'rgba(196, 48, 48, 0.08)',
  warningBg: 'rgba(154, 92, 10, 0.08)',
  accentBg: 'rgba(154, 92, 10, 0.06)',

  // Badge tier colors (AA on cream)
  tierBronze: '#8B5523',   // 5.4:1 on cream
  tierSilver: '#6B6B6B',   // 5.0:1 on cream
  tierGold: '#9A5C0A',     // 5.0:1 on cream
  tierPlatinum: '#5254CC',  // 5.7:1 on cream

  // Map
  mapBackground: '#F5F0E8',
  mapZoomSurface: 'rgba(255,255,255,0.92)',

  // Streak / progress
  pipActive: palette.goldBright,
  pipInactive: palette.dim,

  // Gold alpha (for active cards on light bg)
  goldAlpha10: 'rgba(233, 186, 76, 0.10)',
  goldAlpha15: 'rgba(233, 186, 76, 0.15)',
  goldAlpha50: 'rgba(233, 186, 76, 0.50)',
  goldGlow0: 'rgba(201, 150, 12, 0)',
  goldGlow35: 'rgba(201, 150, 12, 0.35)',

  // Mode bar colors (for game mode list)
  modeRed: '#E05555',
  modeGold: palette.goldBright,
  modeBlue: palette.blue,
  modeGreen: palette.greenBright,
  modePurple: palette.purple,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  none: 0,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
};

// Font family names — these must match the keys used when loading fonts
// Two font families only:
//   LibreBaskerville — display / editorial headings
//   Barlow — everything else (body, labels, buttons, gameplay)
export const fontFamily = {
  display: 'LibreBaskerville_700Bold',
  displayItalic: 'LibreBaskerville_400Regular_Italic',
  uiLabel: 'Barlow_600SemiBold',
  uiLabelMedium: 'Barlow_500Medium',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_600SemiBold',
};

// ---- Type scale — single source of truth for every font size ----
// 14-step ramp. Every fontSize in the app must reference this scale.
export const fontSize = {
  micro: 9,       // streak badge label, ultra-compact text
  xxs: 10,        // micro labels, bottom nav tabs, eyebrow, small caps
  xs: 11,         // compact labels (uppercase done-labels)
  sm: 12,         // chips, badge text, progress labels
  caption: 14,    // captions, subtitles, segment buttons
  body: 16,       // body text, labels, options
  lg: 18,         // emphasized body, card titles, nav header
  xl: 20,         // buttons, section titles, score displays
  heading: 22,    // stat values, headings
  title: 28,      // title-level display
  wordmark: 34,   // app wordmark
  stat: 38,       // large stat tile numbers
  gameTitle: 42,  // gameplay large titles (FlagFlash)
  hero: 52,       // hero display numbers
  gameFeedback: 56, // gameplay feedback text (FlagFlash)
  grade: 72,      // grade letter / big score display
  countdown: 120, // full-screen countdown numbers
};

export const typography = {
  title: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.display,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: fontSize.heading,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 0.3,
  },
  headingUpper: {
    fontSize: fontSize.heading,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.body,
  },
  bodyBold: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bodyBold,
  },
  caption: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.body,
  },
  captionBold: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.bodyMedium,
  },
  eyebrow: {
    fontSize: fontSize.xxs,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
};

export const buttons = {
  primary: {
    backgroundColor: palette.gold,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    borderRadius: borderRadius.lg,
    // Hard offset gold shadow
    shadowColor: palette.goldShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  primaryText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xl,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: palette.white,
  },
  secondary: {
    backgroundColor: palette.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: borderRadius.lg,
  },
  secondaryText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xl,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: palette.inkSecondary,
  },
};

export const nav = {
  backButton: {
    padding: 8,
    width: 60,
  },
  backText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.3,
    color: palette.muted,
    textTransform: 'uppercase' as const,
  },
};

// ---- Responsive layout ----
export const layout = {
  maxContentWidth: 600,
  maxGameWidth: 600,
  breakpoints: {
    tablet: 768,
    desktop: 1024,
  },
};

/** Shared base style for full-screen containers with the app background. */
export const screenContainer = {
  flex: 1 as const,
  backgroundColor: palette.paper,
};

export const shadows = {
  small: {
    shadowColor: colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  large: {
    shadowColor: colors.ink,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  gold: {
    shadowColor: palette.goldShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  accent: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
};
