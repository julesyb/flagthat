import { Platform, useWindowDimensions } from 'react-native';
import { layout } from './theme';

/**
 * Responsive layout hook - single place for screen-size awareness.
 *
 * contentWidth: capped at maxContentWidth (wider on desktop)
 * gameWidth:    capped at maxGameWidth (for game screens)
 * isTablet / isDesktop: breakpoint booleans
 * isDesktopWeb: true when running on web at desktop width (for sidebar nav)
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= layout.breakpoints.tablet;
  const isDesktop = width >= layout.breakpoints.desktop;
  const isDesktopWeb = isDesktop && Platform.OS === 'web';
  const maxContent = isDesktop ? layout.maxContentWidthDesktop : layout.maxContentWidth;
  const contentWidth = Math.min(width, maxContent);
  const maxGame = isDesktop ? layout.maxGameWidthDesktop : layout.maxGameWidth;
  const gameWidth = Math.min(width, maxGame);

  return {
    screenWidth: width,
    screenHeight: height,
    contentWidth,
    gameWidth,
    isTablet,
    isDesktop,
    isDesktopWeb,
  };
}
