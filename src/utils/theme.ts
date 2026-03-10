// =====================
// BRAND GUIDELINES — Flags Are Us
// Voice: Friendly. Modern. Clean.
//
// Rules:
// — Rounded corners on cards and icons.
// — Warm orange accent color.
// — Clean, centered layouts.
// — Soft shadows and subtle borders.
// =====================

// ---- Single source of truth for every color value ----
const palette = {
  ink: '#1E293B',
  inkLight: '#334155',
  orange: '#D4782F',
  orangeLight: '#E08A42',
  slate: '#64748B',
  muted: '#94A3B8',
  rule: '#E2E8F0',
  rule2: '#CBD5E1',
  paper: '#F8F9FA',
  paperDark: '#F1F5F9',
  white: '#FFFFFF',
  black: '#000000',
  green: '#16A34A',
  crimson: '#DC2626',
  amber: '#D97706',
  blue: '#2563EB',
};

export const colors = {
  // Brand palette (direct access)
  ink: palette.ink,
  red: palette.orange,
  slate: palette.slate,
  rule: palette.rule,
  rule2: palette.rule2,
  paper: palette.paper,
  white: palette.white,
  black: palette.black,

  // Semantic roles (all reference palette)
  primary: palette.ink,
  primaryLight: palette.inkLight,
  accent: palette.orange,
  accentLight: palette.orangeLight,
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
  shadow: 'rgba(17, 24, 39, 0.06)',
  overlay: 'rgba(17, 24, 39, 0.5)',

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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Font family names — these must match the keys used when loading fonts
export const fontFamily = {
  display: 'LibreBaskerville_700Bold',
  displayItalic: 'LibreBaskerville_400Regular_Italic',
  uiLabel: 'BarlowCondensed_700Bold',
  uiLabelMedium: 'BarlowCondensed_600SemiBold',
  uiLabelLight: 'BarlowCondensed_500Medium',
  body: 'Barlow_400Regular',
  bodyLight: 'Barlow_300Light',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_600SemiBold',
};

export const typography = {
  hero: {
    fontSize: 52,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.display,
    letterSpacing: -0.5,
  },
  // General-purpose heading — NO uppercase (use headingUpper for that)
  heading: {
    fontSize: 22,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 1,
  },
  // Heading variant with uppercase — for section titles and UI labels
  headingUpper: {
    fontSize: 22,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: 17,
    fontFamily: fontFamily.body,
  },
  bodyBold: {
    fontSize: 17,
    fontFamily: fontFamily.bodyBold,
  },
  caption: {
    fontSize: 13,
    fontFamily: fontFamily.body,
  },
  captionBold: {
    fontSize: 13,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 15,
    fontFamily: fontFamily.bodyMedium,
  },
  // Editorial-specific styles from the template
  eyebrow: {
    fontSize: 10,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  heroCardTitle: {
    fontSize: 26,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  countNumber: {
    fontSize: 52,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
};

export const shadows = {
  small: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  accentShadow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
};
