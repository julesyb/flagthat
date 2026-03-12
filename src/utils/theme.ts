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

// ---- Shared raw palette (constant across themes) ----
const raw = {
  gold: '#9A5C0A',
  goldBright: '#E9BA4C',
  goldShadow: '#5C3506',
  red: '#C43030',
  redLight: '#EC6666',
  green: '#1E8F56',
  greenBright: '#3DBF80',
  blue: '#4DA8E8',
  purple: '#A47FD4',
  white: '#FFFFFF',
  black: '#000000',
};

// ---- Dark palette (DEFAULT) — aligned with HTML prototype vars ----
const palette = {
  ink: '#EEE9E2',           // --ink: light text on dark background
  inkSecondary: '#B8B2A8',  // --ink-2: secondary text
  gold: raw.goldBright,     // Bright gold as CTA on dark
  goldBright: raw.goldBright,
  goldShadow: raw.goldShadow,
  red: raw.redLight,        // Lighter red for dark bg readability
  redLight: raw.redLight,
  muted: '#6E6878',         // --muted: tertiary text
  dim: '#3D3A4A',           // --dim: dimmed elements
  paper: '#15141A',         // --bg: dark background
  paperDark: '#1D1C23',     // --surface: raised dark surface
  raise: '#25242D',         // --raise: secondary raised surface
  white: raw.white,
  black: raw.black,
  green: raw.greenBright,   // Brighter green for dark bg
  greenBright: raw.greenBright,
  blue: raw.blue,
  purple: raw.purple,
  playText: '#130F00',      // --play-text: dark text on gold CTA
};

export const colors = {
  // Brand palette (direct access for commonly needed raw colors)
  ink: palette.ink,
  red: palette.red,
  rule: 'rgba(255,255,255,0.07)',
  ruleDark: 'rgba(255,255,255,0.13)',
  white: palette.white,
  black: palette.black,
  gold: palette.gold,
  goldBright: palette.goldBright,
  purple: palette.purple,
  dim: palette.dim,

  // Semantic roles
  primary: palette.ink,
  primaryLight: palette.paperDark,
  accent: palette.gold,
  accentLight: palette.goldBright,
  success: palette.green,
  error: palette.red,
  warning: palette.gold,
  background: palette.paper,
  surface: palette.paperDark,
  surfaceSecondary: palette.raise,
  text: palette.ink,
  textSecondary: palette.inkSecondary,
  textTertiary: palette.muted,
  border: 'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.13)',
  shadow: 'rgba(0, 0, 0, 0.22)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  inkAlpha10: 'rgba(238, 233, 226, 0.10)',
  playText: palette.playText,

  // Grade colors
  gradeS: raw.goldBright,
  gradeA: raw.greenBright,
  gradeB: raw.blue,
  gradeC: palette.muted,
  gradeD: raw.redLight,
  gradeF: palette.ink,

  // Difficulty colors
  diffEasy: raw.greenBright,
  diffMedium: raw.goldBright,
  diffHard: raw.redLight,
  diffEasyBg: 'rgba(61, 191, 128, 0.12)',
  diffEasyBorder: 'rgba(61, 191, 128, 0.30)',
  diffMediumBg: 'rgba(233, 186, 76, 0.12)',
  diffMediumBorder: 'rgba(233, 186, 76, 0.40)',
  diffHardBg: 'rgba(236, 102, 102, 0.12)',
  diffHardBorder: 'rgba(236, 102, 102, 0.30)',

  // Translucent helpers (for dark backgrounds)
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha45: 'rgba(255,255,255,0.45)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',

  // Dark surface feedback
  darkSurface: 'rgba(255,255,255,0.07)',
  darkBorder: 'rgba(255,255,255,0.12)',
  successOnDark: 'rgba(61,191,128,0.15)',
  successBorderOnDark: 'rgba(61,191,128,0.35)',
  successTextOnDark: raw.greenBright,
  errorOnDark: 'rgba(236,102,102,0.15)',
  errorBorderOnDark: 'rgba(236,102,102,0.35)',
  errorTextOnDark: raw.redLight,

  // Feedback backgrounds (on dark surfaces)
  successBg: 'rgba(61, 191, 128, 0.12)',
  errorBg: 'rgba(236, 102, 102, 0.12)',
  warningBg: 'rgba(233, 186, 76, 0.12)',
  accentBg: 'rgba(233, 186, 76, 0.08)',

  // Badge tier colors (AA on dark)
  tierBronze: '#C4884A',
  tierSilver: '#A0A0A0',
  tierGold: raw.goldBright,
  tierPlatinum: '#8B8DFF',

  // Nav
  navBg: 'rgba(21,20,26,0.97)',

  // Map
  mapBackground: palette.paperDark,
  mapZoomSurface: 'rgba(29, 28, 35, 0.92)',

  // Streak / progress
  pipActive: raw.goldBright,
  pipInactive: palette.dim,

  // Gold alpha (for active cards on dark bg)
  goldAlpha10: 'rgba(233, 186, 76, 0.10)',
  goldAlpha15: 'rgba(233, 186, 76, 0.15)',
  goldAlpha50: 'rgba(233, 186, 76, 0.50)',
  goldGlow0: 'rgba(201, 150, 12, 0)',
  goldGlow35: 'rgba(201, 150, 12, 0.35)',

  // Mode bar colors (for game mode list)
  modeRed: '#E05555',
  modeGold: raw.goldBright,
  modeBlue: raw.blue,
  modeGreen: raw.greenBright,
  modePurple: raw.purple,
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
    backgroundColor: raw.goldBright,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    borderRadius: borderRadius.lg,
    shadowColor: raw.goldShadow,
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
    color: palette.playText,
  },
  secondary: {
    backgroundColor: palette.paperDark,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
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
    color: colors.textTertiary,
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
    shadowColor: raw.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 1,
  },
  medium: {
    shadowColor: raw.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 2,
  },
  large: {
    shadowColor: raw.black,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 4,
  },
  gold: {
    shadowColor: raw.goldShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  accent: {
    shadowColor: raw.goldShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 3,
  },
};
