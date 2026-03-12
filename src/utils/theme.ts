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
const darkPalette = {
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

// ---- Light palette — warm parchment, classic Flag That ----
const lightPalette = {
  ink: '#1A1820',           // dark ink text
  inkSecondary: '#5C5764',  // secondary text
  gold: raw.gold,           // deeper gold for light bg
  goldBright: raw.goldBright,
  goldShadow: raw.goldShadow,
  red: raw.red,             // standard red on light bg
  redLight: raw.redLight,
  muted: '#8A8494',         // tertiary text
  dim: '#D5CFC6',           // dimmed elements on light bg
  paper: '#F5EFE6',         // warm parchment background
  paperDark: '#FFFFFF',     // white surface cards
  raise: '#EDE7DE',         // secondary raised surface
  white: raw.white,
  black: raw.black,
  green: raw.green,         // standard green on light bg
  greenBright: raw.greenBright,
  blue: raw.blue,
  purple: raw.purple,
  playText: '#130F00',      // dark text on gold CTA
};

function buildColors(p: typeof darkPalette, isDark: boolean) {
  const dk = isDark;
  return {
    // Brand palette (direct access for commonly needed raw colors)
    ink: p.ink,
    red: p.red,
    rule: dk ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    ruleDark: dk ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)',
    white: p.white,
    black: p.black,
    gold: p.gold,
    goldBright: p.goldBright,
    purple: p.purple,
    dim: p.dim,

    // Semantic roles
    primary: p.ink,
    primaryLight: p.paperDark,
    accent: p.gold,
    accentLight: p.goldBright,
    success: p.green,
    error: p.red,
    warning: p.gold,
    background: p.paper,
    surface: p.paperDark,
    surfaceSecondary: p.raise,
    text: p.ink,
    textSecondary: p.inkSecondary,
    textTertiary: p.muted,
    border: dk ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    borderLight: dk ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.12)',
    shadow: dk ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.10)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    inkAlpha10: dk ? 'rgba(238, 233, 226, 0.10)' : 'rgba(26, 24, 32, 0.08)',
    playText: p.playText,

    // Grade colors
    gradeS: raw.goldBright,
    gradeA: dk ? raw.greenBright : raw.green,
    gradeB: raw.blue,
    gradeC: p.muted,
    gradeD: dk ? raw.redLight : raw.red,
    gradeF: p.ink,

    // Difficulty colors
    diffEasy: dk ? raw.greenBright : raw.green,
    diffMedium: raw.goldBright,
    diffHard: dk ? raw.redLight : raw.red,
    diffEasyBg: dk ? 'rgba(61, 191, 128, 0.12)' : 'rgba(30, 143, 86, 0.10)',
    diffEasyBorder: dk ? 'rgba(61, 191, 128, 0.30)' : 'rgba(30, 143, 86, 0.25)',
    diffMediumBg: 'rgba(233, 186, 76, 0.12)',
    diffMediumBorder: dk ? 'rgba(233, 186, 76, 0.40)' : 'rgba(154, 92, 10, 0.25)',
    diffHardBg: dk ? 'rgba(236, 102, 102, 0.12)' : 'rgba(196, 48, 48, 0.10)',
    diffHardBorder: dk ? 'rgba(236, 102, 102, 0.30)' : 'rgba(196, 48, 48, 0.25)',

    // Translucent helpers
    whiteAlpha15: dk ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
    whiteAlpha20: dk ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.08)',
    whiteAlpha45: dk ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.20)',
    whiteAlpha50: dk ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.25)',
    whiteAlpha60: dk ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.35)',
    whiteAlpha70: dk ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.45)',

    // Surface feedback
    darkSurface: dk ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
    darkBorder: dk ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    successOnDark: dk ? 'rgba(61,191,128,0.15)' : 'rgba(30,143,86,0.10)',
    successBorderOnDark: dk ? 'rgba(61,191,128,0.35)' : 'rgba(30,143,86,0.25)',
    successTextOnDark: dk ? raw.greenBright : raw.green,
    errorOnDark: dk ? 'rgba(236,102,102,0.15)' : 'rgba(196,48,48,0.10)',
    errorBorderOnDark: dk ? 'rgba(236,102,102,0.35)' : 'rgba(196,48,48,0.25)',
    errorTextOnDark: dk ? raw.redLight : raw.red,

    // Feedback backgrounds
    successBg: dk ? 'rgba(61, 191, 128, 0.12)' : 'rgba(30, 143, 86, 0.10)',
    errorBg: dk ? 'rgba(236, 102, 102, 0.12)' : 'rgba(196, 48, 48, 0.08)',
    warningBg: 'rgba(233, 186, 76, 0.12)',
    accentBg: 'rgba(233, 186, 76, 0.08)',

    // Badge tier colors
    tierBronze: '#C4884A',
    tierSilver: '#A0A0A0',
    tierGold: raw.goldBright,
    tierPlatinum: '#8B8DFF',

    // Nav
    navBg: dk ? 'rgba(21,20,26,0.97)' : 'rgba(245,239,230,0.97)',

    // Map
    mapBackground: p.paperDark,
    mapZoomSurface: dk ? 'rgba(29, 28, 35, 0.92)' : 'rgba(255, 255, 255, 0.92)',

    // Streak / progress
    pipActive: raw.goldBright,
    pipInactive: p.dim,

    // Gold alpha
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
}

export const darkColors = buildColors(darkPalette, true);
export const lightColors = buildColors(lightPalette, false);

/** Color values type — use with useTheme() hook */
export type ThemeColors = typeof darkColors;

/** Theme mode preference */
export type ThemeMode = 'light' | 'dark' | 'system';

// Default export for backward compat (dark theme)
export const colors = darkColors;

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
// 8-step ramp: 5 UI sizes + 3 display sizes. Minimum 11px for readability.
// Every fontSize in the app must reference this scale — no math adjustments.
export const fontSize = {
  xs: 11,         // eyebrow labels, nav tabs, small caps, badges, chips
  sm: 13,         // captions, subtitles, segment buttons, tags
  body: 16,       // body text, labels, options, card titles
  lg: 20,         // buttons, section titles, headings, stat values
  title: 28,      // page titles, wordmark, large headings
  display: 42,    // gameplay titles (Flash Flag), grade letters, large stat numbers
  hero: 72,       // hero display numbers, countdown feedback
  countdown: 120, // full-screen countdown numbers
};

export const typography = {
  // ── Page-level titles (LibreBaskerville 28px) ──
  title: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.display,
    letterSpacing: -0.5,
  },
  // ── Section headings (Barlow SemiBold 20px) ──
  heading: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 0.3,
  },
  headingUpper: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  // ── Body text (Barlow 16px) ──
  body: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.body,
  },
  bodyBold: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.bodyBold,
  },
  // ── Captions / subtitles (Barlow 13px) ──
  caption: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.body,
  },
  captionBold: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.2,
  },
  // ── Labels (Barlow Medium 16px) ──
  label: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.bodyMedium,
  },
  // ── Eyebrow labels (Barlow SemiBold 11px, uppercase) ──
  eyebrow: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  // ── Small text presets (11px) — for badges, chips, meta text ──
  micro: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.body,
  },
  microMedium: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodyMedium,
  },
  microBold: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bodyBold,
  },
  // ── Caption strong (13px SemiBold) — badge names, milestone titles ──
  captionStrong: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyBold,
  },
  // ── Small bold label (11px SemiBold, no uppercase) — nav tabs, score badges ──
  tag: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.uiLabel,
  },
  // ── Action label (13px SemiBold, uppercase) — button text, CTAs ──
  actionLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.uiLabel,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  // ── Display numerals (LibreBaskerville at lg/display/hero/countdown sizes) ──
  statValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.display,
    letterSpacing: -0.5,
  },
  displayValue: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
};

export function buildButtons(c: ThemeColors) {
  return {
    primary: {
      backgroundColor: c.goldBright,
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
      fontSize: fontSize.lg,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: c.playText,
    },
    secondary: {
      backgroundColor: c.surface,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.lg,
    },
    secondaryText: {
      fontFamily: fontFamily.uiLabel,
      fontSize: fontSize.lg,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: c.textSecondary,
    },
  };
}

export function buildNav(c: ThemeColors) {
  return {
    backButton: {
      padding: 8,
      width: 60,
    },
    backText: {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.bodyMedium,
      letterSpacing: 0.3,
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
    },
  };
}

// ---- Responsive layout ----
export const layout = {
  maxContentWidth: 600,
  maxGameWidth: 600,
  breakpoints: {
    tablet: 768,
    desktop: 1024,
  },
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
