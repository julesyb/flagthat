import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import GameScreen from './src/screens/GameScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import StatsScreen from './src/screens/StatsScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import HeadsUpScreen from './src/screens/HeadsUpScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { RootStackParamList } from './src/types/navigation';
import { colors, typography } from './src/utils/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    ...typography.bodyBold,
  },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: {
    backgroundColor: colors.background,
  },
};

export default function App() {
  return (
    <ErrorBoundary>
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
          options={{ title: 'New Game' }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="HeadsUp"
          component={HeadsUpScreen}
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
          options={{ title: 'Statistics' }}
        />
        <Stack.Screen
          name="Browse"
          component={BrowseScreen}
          options={{ title: 'Browse Flags' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
}
