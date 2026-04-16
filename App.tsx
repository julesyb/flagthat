import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Linking } from 'react-native';
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
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import GameScreen from './src/screens/GameScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import FlashFlagScreen from './src/screens/FlashFlagScreen';
import FlagPuzzleScreen from './src/screens/FlagPuzzleScreen';
import NeighborsScreen from './src/screens/NeighborsScreen';
import FlagImpostorScreen from './src/screens/FlagImpostorScreen';
import CapitalConnectionScreen from './src/screens/CapitalConnectionScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import JoinChallengeScreen from './src/screens/JoinChallengeScreen';
import ChallengeResponseScreen from './src/screens/ChallengeResponseScreen';
import DailyShareReceiveScreen from './src/screens/DailyShareReceiveScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ChevronLeftIcon } from './src/components/Icons';
import { RootStackParamList } from './src/types/navigation';
import { colors, fontSize, APP_URL } from './src/utils/theme';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { configureNotificationHandler, syncNotificationSchedule } from './src/utils/notifications';
import { initLocale, t } from './src/utils/i18n';
import { hasCompletedOnboarding, primeFlagLastShownCache, primeFlagStatsCache } from './src/utils/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Wraps a game screen to redirect to Home if config param is missing (e.g. corrupted deep link).
 * Uses `any` because React Navigation screen props are contravariant in the route name,
 * making generic HOC typing impractical without type assertions at every call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withConfigGuard(Screen: React.ComponentType<any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function ConfigGuard(props: any) {
    const config = props.route?.params?.config;
    useEffect(() => {
      if (!config) props.navigation.replace('Home');
    }, [config, props.navigation]);
    if (!config) return null;
    return <Screen {...props} />;
  };
}

const gameScreenConfig = {
  parse: {
    config: (json: string) => {
      try { return JSON.parse(json); } catch { return undefined; }
    },
  },
  stringify: { config: (config: object) => JSON.stringify(config) },
};

const linking = {
  prefixes: [APP_URL, 'flagthat://'],
  config: {
    screens: {
      JoinChallenge: {
        path: 'c/:code',
        parse: { code: (code: string) => decodeURIComponent(code) },
      },
      ChallengeResponse: {
        path: 'r/:code',
        parse: { code: (code: string) => decodeURIComponent(code) },
      },
      DailyShareReceive: {
        path: 'd/:code',
        parse: { code: (code: string) => decodeURIComponent(code) },
      },
      Game: { path: 'Game', ...gameScreenConfig },
      FlashFlag: { path: 'FlashFlag', ...gameScreenConfig },
      FlagPuzzle: { path: 'FlagPuzzle', ...gameScreenConfig },
      Neighbors: { path: 'Neighbors', ...gameScreenConfig },
      FlagImpostor: { path: 'FlagImpostor', ...gameScreenConfig },
      CapitalConnection: { path: 'CapitalConnection', ...gameScreenConfig },
    },
  },
};

function BackButton({ onPress }: { onPress: () => void }) {
  const { colors: c } = useTheme();
  return (
    <TouchableOpacity
      style={{ marginLeft: -8, padding: 8 }}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('app.goBack')}
    >
      <ChevronLeftIcon size={22} color={c.ink} />
    </TouchableOpacity>
  );
}

function useScreenOptions() {
  const { colors: c } = useTheme();
  return React.useMemo(() => ({
    headerStyle: {
      backgroundColor: c.background,
    },
    headerTintColor: c.text,
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    title: '',
    contentStyle: {
      backgroundColor: c.background,
    },
  }), [c]);
}

// Configure notification display behavior at module level
configureNotificationHandler();

const GuardedGame = withConfigGuard(GameScreen);
const GuardedFlashFlag = withConfigGuard(FlashFlagScreen);
const GuardedFlagPuzzle = withConfigGuard(FlagPuzzleScreen);
const GuardedNeighbors = withConfigGuard(NeighborsScreen);
const GuardedFlagImpostor = withConfigGuard(FlagImpostorScreen);
const GuardedCapitalConnection = withConfigGuard(CapitalConnectionScreen);

function AppContent() {
  const [localeReady, setLocaleReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Home');
  const screenOptions = useScreenOptions();

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Flag That';
    }
    initLocale()
      .then(async () => {
        const [onboarded] = await Promise.all([
          hasCompletedOnboarding(),
          primeFlagLastShownCache(),
          primeFlagStatsCache(),
        ]);
        setInitialRoute(onboarded ? 'Home' : 'Onboarding');
        setLocaleReady(true);
        syncNotificationSchedule();
      })
      .catch(() => {
        setLocaleReady(true);
      });
  }, []);

  if (!localeReady) return null;

  return (
    <NavigationContainer linking={linking}>
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
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="Game"
          component={GuardedGame}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="FlashFlag"
          component={GuardedFlashFlag}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="FlagPuzzle"
          component={GuardedFlagPuzzle}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Neighbors"
          component={GuardedNeighbors}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="FlagImpostor"
          component={GuardedFlagImpostor}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="CapitalConnection"
          component={GuardedCapitalConnection}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="JoinChallenge"
          component={JoinChallengeScreen}
          options={({ navigation }) => ({
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="ChallengeResponse"
          component={ChallengeResponseScreen}
          options={({ navigation }) => ({
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="DailyShareReceive"
          component={DailyShareReceiveScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={({ navigation }) => ({
            headerLeft: () => <BackButton onPress={() => navigation.navigate('Home')} />,
            gestureEnabled: false,
          })}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={({ navigation }) => ({
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }) => ({
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
          })}
        />
        <Stack.Screen
          name="Browse"
          component={BrowseScreen}
          options={({ navigation }) => ({
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
          })}
        />
      </Stack.Navigator>
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
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent />
        {Platform.OS === 'web' && <Analytics />}
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
