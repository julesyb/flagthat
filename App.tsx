import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Analytics } from '@vercel/analytics/react';
import { useFonts } from 'expo-font';
import {
  LibreBaskerville_700Bold,
  LibreBaskerville_400Regular_Italic,
} from '@expo-google-fonts/libre-baskerville';
import {
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
} from '@expo-google-fonts/barlow';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import GameScreen from './src/screens/GameScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import FlagFlashScreen from './src/screens/FlagFlashScreen';
import FlagPuzzleScreen from './src/screens/FlagPuzzleScreen';
import NeighborsScreen from './src/screens/NeighborsScreen';
import FlagImpostorScreen from './src/screens/FlagImpostorScreen';
import CapitalConnectionScreen from './src/screens/CapitalConnectionScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import SideNav from './src/components/SideNav';
import { ChevronLeftIcon } from './src/components/Icons';
import { RootStackParamList } from './src/types/navigation';
import { TabId } from './src/components/BottomNav';
import { colors, fontFamily, fontSize } from './src/utils/theme';
import { useLayout } from './src/utils/useLayout';
import { configureNotificationHandler, syncNotificationSchedule } from './src/utils/notifications';
import { initLocale, t } from './src/utils/i18n';
import { hasCompletedOnboarding } from './src/utils/storage';
import { initializeAds, requestConsent } from './src/utils/ads';
import { hapticTap } from './src/utils/feedback';

const Stack = createNativeStackNavigator<RootStackParamList>();

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ marginLeft: -8, padding: 8 }}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('app.goBack')}
    >
      <ChevronLeftIcon size={22} color={colors.ink} />
    </TouchableOpacity>
  );
}

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.lg,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: {
    backgroundColor: colors.background,
  },
};

// Configure notification display behavior at module level
configureNotificationHandler();

const TAB_ROUTES: Record<TabId, keyof RootStackParamList> = {
  Play: 'Home',
  Modes: 'GameSetup',
  Stats: 'Stats',
  Browse: 'Browse',
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function DesktopSideNavWrapper() {
  const { isDesktopWeb } = useLayout();

  const handleNavigate = useCallback((tab: TabId) => {
    hapticTap();
    const route = TAB_ROUTES[tab];
    if (navigationRef.isReady()) {
      navigationRef.navigate(route as never);
    }
  }, []);

  if (!isDesktopWeb) return null;
  return <SideNav onNavigate={handleNavigate} />;
}

function AppContent() {
  const [localeReady, setLocaleReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Home');

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Flag That';
      // Inject global CSS for web-specific interactive styles
      const style = document.createElement('style');
      style.textContent = [
        // Pointer cursor on all touchable/pressable elements
        '[role="button"], [role="tab"], [role="link"] { cursor: pointer; }',
        // Smooth transitions for hover effects
        '[role="button"], [role="tab"] { transition: opacity 0.15s ease, transform 0.15s ease, filter 0.15s ease; }',
        // Hover: slight brightness boost + subtle lift (desktop only, not touch)
        '@media (hover: hover) {',
        '  [role="button"]:hover, [role="tab"]:hover { opacity: 0.88; filter: brightness(1.03); transform: translateY(-1px); }',
        '  [role="button"]:active, [role="tab"]:active { transform: translateY(0px); opacity: 0.75; }',
        '}',
        // Focus-visible outline for keyboard navigation
        `[role="button"]:focus-visible, [role="tab"]:focus-visible, input:focus-visible { outline: 2px solid ${colors.accent}; outline-offset: 2px; }`,
        // Remove default focus ring for mouse users
        '[role="button"]:focus:not(:focus-visible), [role="tab"]:focus:not(:focus-visible) { outline: none; }',
        // Styled scrollbar
        '::-webkit-scrollbar { width: 6px; }',
        '::-webkit-scrollbar-track { background: transparent; }',
        '::-webkit-scrollbar-thumb { background: rgba(26,26,46,0.15); border-radius: 3px; }',
        '::-webkit-scrollbar-thumb:hover { background: rgba(26,26,46,0.3); }',
        // Prevent text selection on interactive elements
        '[role="button"], [role="tab"] { user-select: none; -webkit-user-select: none; }',
      ].join('\n');
      document.head.appendChild(style);
    }
    initLocale()
      .then(async () => {
        const onboarded = await hasCompletedOnboarding();
        setInitialRoute(onboarded ? 'Home' : 'Onboarding');
        setLocaleReady(true);
        syncNotificationSchedule();
        requestConsent().then(() => initializeAds());
      })
      .catch(() => {
        setLocaleReady(true);
      });
  }, []);

  if (!localeReady) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <View style={appStyles.shell}>
        <DesktopSideNavWrapper />
        <View style={appStyles.content}>
          <Stack.Navigator screenOptions={screenOptions} initialRouteName={initialRoute}>
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GameSetup"
              component={GameSetupScreen}
              options={({ navigation }) => ({
                title: t('app.gameModes'),
                headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
              })}
            />
            <Stack.Screen
              name="Game"
              component={GameScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="FlagFlash"
              component={FlagFlashScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="FlagPuzzle"
              component={FlagPuzzleScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="Neighbors"
              component={NeighborsScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="FlagImpostor"
              component={FlagImpostorScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="CapitalConnection"
              component={CapitalConnectionScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="Results"
              component={ResultsScreen}
              options={({ navigation }) => ({
                title: t('app.results'),
                headerLeft: () => <BackButton onPress={() => navigation.navigate('Home')} />,
                gestureEnabled: false,
              })}
            />
            <Stack.Screen
              name="Stats"
              component={StatsScreen}
              options={({ navigation }) => ({
                title: t('app.statistics'),
                headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
              })}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={({ navigation }) => ({
                title: t('app.settings'),
                headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
              })}
            />
            <Stack.Screen
              name="Browse"
              component={BrowseScreen}
              options={({ navigation }) => ({
                title: t('app.browseFlags'),
                headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
              })}
            />
          </Stack.Navigator>
        </View>
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    LibreBaskerville_700Bold,
    LibreBaskerville_400Regular_Italic,
    Barlow_300Light,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.ink} />
        <Text style={loadingStyles.text}>Loading</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AppContent />
      {Platform.OS === 'web' && <Analytics />}
    </ErrorBoundary>
  );
}

const appStyles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: fontSize.caption,
    color: colors.slate,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
