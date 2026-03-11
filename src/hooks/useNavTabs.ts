import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { TabId } from '../components/BottomNav';
import { hapticTap } from '../utils/feedback';

const TAB_ROUTES: Record<TabId, keyof RootStackParamList> = {
  Home: 'Home',
  Modes: 'GameSetup',
  Stats: 'Stats',
  Browse: 'Browse',
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
