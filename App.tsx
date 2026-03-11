import React, { useEffect, useState } from 'react';
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
import { NavigationContainer } from '@react-navigation/native';
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
import ErrorBoundary from './src/components/ErrorBoundary';
import { ChevronLeftIcon } from './src/components/Icons';
import { RootStackParamList } from './src/types/navigation';
import { colors, fontFamily, fontSize } from './src/utils/theme';
import { configureNotificationHandler, syncNotificationSchedule } from './src/utils/notifications';
import { initLocale, t } from './src/utils/i18n';

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeBackButton({ onPress }: { onPress: () => void }) {
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

function AppContent() {
  const [localeReady, setLocaleReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Flag That';
    }
    // Initialize locale from saved settings, then sync notifications
    initLocale()
      .then(() => {
        setLocaleReady(true);
        syncNotificationSchedule();
      })
      .catch(() => {
        setLocaleReady(true);
      });
  }, []);

  if (!localeReady) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
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
            headerLeft: () => <HomeBackButton onPress={() => navigation.navigate('Home')} />,
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
            headerLeft: () => <HomeBackButton onPress={() => navigation.navigate('Home')} />,
            gestureEnabled: false,
          })}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={({ navigation }) => ({
            title: t('app.statistics'),
            headerLeft: () => <HomeBackButton onPress={() => navigation.navigate('Home')} />,
          })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }) => ({
            title: t('app.settings'),
            headerLeft: () => <HomeBackButton onPress={() => navigation.navigate('Home')} />,
          })}
        />
        <Stack.Screen
          name="Browse"
          component={BrowseScreen}
          options={({ navigation }) => ({
            title: t('app.browseFlags'),
            headerLeft: () => <HomeBackButton onPress={() => navigation.navigate('Home')} />,
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
    <ErrorBoundary>
      <AppContent />
      {Platform.OS === 'web' && <Analytics />}
    </ErrorBoundary>
  );
}

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
