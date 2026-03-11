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
// - Accent red appears maximum twice per screen.
// - No emoji anywhere in the UI. Use SVG icons from Icons.tsx.
// - No em dashes in user-facing text. Use hyphens or commas.
//
// Palette: Retro-warm (90s nostalgia meets 2026 polish).
//   Deep midnight navy, warm cream surfaces, coral-red accent,
//   teal/gold/electric-blue pops for variety.
// =====================

// ---- Single source of truth for every color value ----
const palette = {
  ink: '#1A1A2E',         // Deep midnight navy (retro cartridge vibes)
  inkLight: '#2A2A45',    // Lighter midnight
  red: '#E84855',         // Warm coral-red (friendlier, more playful)
  redLight: '#FF6B6B',    // Light coral
  slate: '#4E5172',       // Indigo-slate (warm secondary text)
  muted: '#6F7194',       // Muted lavender (AA on cream, 4.7:1)
  rule: '#E6DDD5',        // Warm rule line
  rule2: '#D6CCC3',       // Warmer rule
  paper: '#FFF7EE',       // Warm cream background
  paperDark: '#EFE6DC',   // Darker cream
  white: '#FFFFFF',
  black: '#000000',
  green: '#16A34A',       // Success green (functional, unchanged)
  crimson: '#DC2626',     // Error red (functional, unchanged)
  amber: '#E8A317',       // Warm gold
  blue: '#4361EE',        // Electric retro blue
  teal: '#00B4A6',        // 90s teal (icons, graphical accents)
};

export const colors = {
  // Brand palette (direct access)
  ink: palette.ink,
  red: palette.red,
  slate: palette.slate,
  rule: palette.rule,
  rule2: palette.rule2,
  paper: palette.paper,
  white: palette.white,
  black: palette.black,
  teal: palette.teal,
  blue: palette.blue,
  amber: palette.amber,

  // Semantic roles (all reference palette)
  primary: palette.ink,
  primaryLight: palette.inkLight,
  accent: palette.red,
  accentLight: palette.redLight,
  success: palette.green,
  error: palette.crimson,
  warning: palette.amber,
  background: palette.paper,
  surface: palette.white,
  surfaceSecondary: palette.paperDark,
  text: palette.ink,
  textSecondary: palette.slate,
  textTertiary: palette.muted,
  border: palette.rule,
  borderLight: palette.paperDark,
  shadow: 'rgba(26, 26, 46, 0.06)',
  overlay: 'rgba(26, 26, 46, 0.5)',

  // Grade colors
  gradeS: palette.amber,
  gradeA: palette.green,
  gradeB: palette.blue,
  gradeC: palette.amber,
  gradeD: palette.crimson,
  gradeF: palette.crimson,

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
  successOnDark: 'rgba(56,195,100,0.2)',
  successBorderOnDark: 'rgba(56,195,100,0.5)',
  successTextOnDark: '#7ee8a2',
  errorOnDark: 'rgba(207,35,24,0.2)',
  errorBorderOnDark: 'rgba(207,35,24,0.45)',
  errorTextOnDark: '#f8a09a',

  // Light feedback backgrounds (on white/paper)
  successBg: 'rgba(22, 163, 74, 0.08)',
  errorBg: 'rgba(220, 38, 38, 0.08)',
  warningBg: 'rgba(232, 163, 23, 0.08)',
  accentBg: 'rgba(232, 72, 85, 0.06)',

  // Map
  mapBackground: '#f5f0e8',
  mapZoomSurface: 'rgba(255,255,255,0.92)',
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
  uiLabelLight: 'Barlow_400Regular',
  body: 'Barlow_400Regular',
  bodyLight: 'Barlow_300Light',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_600SemiBold',
};

// ---- Type scale — single source of truth for every font size ----
// 13-step ramp. Every fontSize in the app must reference this scale.
export const fontSize = {
  xxs: 10,        // micro labels, bottom nav tabs, eyebrow, small caps
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
  grade: 72,      // grade letter
  countdown: 120, // full-screen countdown numbers
};

export const typography = {
  hero: {
    fontSize: fontSize.hero,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
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
  sectionLabel: {
    fontSize: fontSize.xxs,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontSize: fontSize.heading,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  heroCardTitle: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  countNumber: {
    fontSize: fontSize.hero,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
};

export const borders = {
  thin: 1,
  medium: 1.5,
  thick: 2,
};

export const buttons = {
  primary: {
    backgroundColor: palette.ink,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    borderRadius: borderRadius.lg,
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
    borderWidth: 2,
    borderColor: palette.ink,
    borderRadius: borderRadius.lg,
  },
  secondaryText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.xl,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: palette.ink,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.rule,
    backgroundColor: palette.white,
    borderRadius: borderRadius.sm,
  },
  chipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: palette.slate,
  },
  chipTextActive: {
    color: palette.white,
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
  headerHeight: 56,
  gameTopBarHeight: 48,
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
  accentShadow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
};
