import { useWindowDimensions } from 'react-native';
import { layout } from './theme';

/**
 * Responsive layout hook - single place for screen-size awareness.
 *
 * contentWidth: capped at maxContentWidth (for non-game screens)
 * gameWidth:    capped at maxGameWidth (for game screens)
 * isTablet / isDesktop: breakpoint booleans
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= layout.breakpoints.tablet;
  const isDesktop = width >= layout.breakpoints.desktop;
  const contentWidth = Math.min(width, layout.maxContentWidth);
  const gameWidth = Math.min(width, layout.maxGameWidth);

  return {
    screenWidth: width,
    screenHeight: height,
    contentWidth,
    gameWidth,
    isTablet,
    isDesktop,
  };
}
