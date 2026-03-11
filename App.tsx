import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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
import { TouchableOpacity, Text as RNText } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import GameScreen from './src/screens/GameScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import StatsScreen from './src/screens/StatsScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import FlagFlashScreen from './src/screens/FlagFlashScreen';
import FlagPuzzleScreen from './src/screens/FlagPuzzleScreen';
import NeighborsScreen from './src/screens/NeighborsScreen';
import FlagImpostorScreen from './src/screens/FlagImpostorScreen';
import CapitalConnectionScreen from './src/screens/CapitalConnectionScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ChevronLeftIcon } from './src/components/Icons';
import { RootStackParamList } from './src/types/navigation';
import { colors, typography, fontFamily } from './src/utils/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: {
    backgroundColor: colors.background,
  },
};

function AppContent() {
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
            title: 'Game Modes',
            headerLeft: () => (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8, paddingRight: 12 }}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.7}
              >
                <ChevronLeftIcon size={20} color={colors.textTertiary} />
                <RNText style={{ fontFamily: 'Barlow_500Medium', fontSize: 13, letterSpacing: 0.3, color: colors.textTertiary, textTransform: 'uppercase', marginLeft: 2 }}>Play</RNText>
              </TouchableOpacity>
            ),
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
          options={{ title: 'Results', headerLeft: () => null, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={({ navigation }) => ({
            title: 'Statistics',
            headerLeft: () => (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8, paddingRight: 12 }}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.7}
              >
                <ChevronLeftIcon size={20} color={colors.textTertiary} />
                <RNText style={{ fontFamily: 'Barlow_500Medium', fontSize: 13, letterSpacing: 0.3, color: colors.textTertiary, textTransform: 'uppercase', marginLeft: 2 }}>Play</RNText>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Browse"
          component={BrowseScreen}
          options={({ navigation }) => ({
            title: 'Browse Flags',
            headerLeft: () => (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8, paddingRight: 12 }}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.7}
              >
                <ChevronLeftIcon size={20} color={colors.textTertiary} />
                <RNText style={{ fontFamily: 'Barlow_500Medium', fontSize: 13, letterSpacing: 0.3, color: colors.textTertiary, textTransform: 'uppercase', marginLeft: 2 }}>Play</RNText>
              </TouchableOpacity>
            ),
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
    fontSize: 13,
    color: colors.slate,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
