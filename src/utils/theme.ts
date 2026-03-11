// =====================
// BRAND GUIDELINES — Flag That
// Voice: Intelligent. Editorial. Authoritative.
//
// Rules:
// — Rounded corners on cards and interactive elements (sm–xl scale).
// — No gradients. Flat color planes.
// — No drop shadows except offset hard shadows on hover.
// — Accent red appears maximum twice per screen.
// — No emoji anywhere in the UI. Use SVG icons from Icons.tsx.
// =====================

// ---- Single source of truth for every color value ----
const palette = {
  ink: '#111827',
  inkLight: '#1F2937',
  red: '#E5271C',
  redLight: '#EF4444',
  slate: '#4B5563',
  muted: '#9CA3AF',
  rule: '#E5E7EB',
  rule2: '#D1D5DB',
  paper: '#F9FAFB',
  paperDark: '#F3F4F6',
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
  red: palette.red,
  slate: palette.slate,
  rule: palette.rule,
  rule2: palette.rule2,
  paper: palette.paper,
  white: palette.white,
  black: palette.black,

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

  // Dark surface feedback (on dark/navy backgrounds)
  darkSurface: 'rgba(255,255,255,0.07)',
  darkBorder: 'rgba(255,255,255,0.1)',
  successOnDark: 'rgba(56,195,100,0.2)',
  successBorderOnDark: 'rgba(56,195,100,0.5)',
  successTextOnDark: '#7ee8a2',
  errorOnDark: 'rgba(207,35,24,0.2)',
  errorBorderOnDark: 'rgba(207,35,24,0.45)',
  errorTextOnDark: '#f8a09a',

  // Map
  mapBackground: '#e8e4df',
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
  heading: {
    fontSize: 22,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 1,
  },
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
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 18,
    letterSpacing: 1.5,
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
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 18,
    letterSpacing: 1.5,
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
    fontFamily: 'BarlowCondensed_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
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
    fontSize: 13,
    fontFamily: 'BarlowCondensed_600SemiBold',
    letterSpacing: 0.5,
    color: palette.muted,
    textTransform: 'uppercase' as const,
  },
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
