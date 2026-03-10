export const colors = {
  primary: '#1B2838',
  primaryLight: '#2A3F56',
  accent: '#4A90D9',
  accentLight: '#6BB0F5',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F8FA',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',
  border: '#E5E5EA',
  borderLight: '#F0F0F5',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  hero: {
    fontSize: 36,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
};

export const shadows = {
  small: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  large: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};
