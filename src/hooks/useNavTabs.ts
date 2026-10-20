import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { TabId, TAB_ORDER } from '../components/BottomNav';
import { hapticTap } from '../utils/feedback';
import { adjacentItem, arrowStep } from '../utils/shortcuts';
import { useKeyShortcuts } from './useKeyShortcuts';
import { useSwipe } from './useSwipe';

const TAB_ROUTES: Record<TabId, keyof RootStackParamList> = {
  Home: 'Home',
  Modes: 'GameSetup',
  Stats: 'Stats',
  Browse: 'Browse',
  Settings: 'Settings',
};

/**
 * Returns a stable onNavigate callback for BottomNav.
 * Handles haptic feedback and routing in one place.
 */
export function useNavTabs() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const onNavigate = useCallback(
    (tab: TabId) => {
      hapticTap();
      const route = TAB_ROUTES[tab];
      navigation.navigate(route as never);
    },
    [navigation],
  );

  return onNavigate;
}

/**
 * Moves between neighbouring tabs: swipe left/right on touch screens, or the
 * left/right arrow keys on web. Spread the returned handlers on the screen's root view.
 */
export function useTabGestures(activeTab: TabId) {
  const onNavigate = useNavTabs();

  const step = (dir: -1 | 1) => {
    const next = adjacentItem(TAB_ORDER, activeTab, dir);
    if (!next) return false;
    onNavigate(next);
    return true;
  };

  useKeyShortcuts((key) => {
    const dir = arrowStep(key, 'horizontal');
    return dir !== 0 && step(dir);
  });

  // Swiping left drags the next tab in from the right
  return useSwipe({ onSwipe: (direction) => step(direction === 'left' ? 1 : -1) });
}
