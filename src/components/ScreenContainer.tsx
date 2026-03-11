import React from 'react';
import { View, StyleSheet } from 'react-native';
import { layout } from '../utils/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
}

/**
 * Wraps screen content with a centered max-width container.
 * Use inside SafeAreaView / ScrollView to constrain content on tablets and desktop.
 */
export default function ScreenContainer({ children, maxWidth = layout.maxContentWidth }: ScreenContainerProps) {
  return (
    <View style={[styles.wrapper, { maxWidth }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
  },
});
