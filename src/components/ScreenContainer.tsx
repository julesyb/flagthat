import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useLayout } from '../utils/useLayout';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Set true when this wrapper needs to fill available space (e.g. wrapping a FlatList or game content). */
  flex?: boolean;
  /** Use gameWidth instead of contentWidth (for game screens). */
  game?: boolean;
}

/**
 * Centered max-width container for screen content.
 * Replaces ad-hoc desktopWrapper / contentInner styles across all screens.
 *
 * Usage:
 *   <ScrollView contentContainerStyle={...}>
 *     <ScreenContainer>{content}</ScreenContainer>
 *   </ScrollView>
 *
 * For non-scrollable layouts (FlatList, game screens):
 *   <ScreenContainer flex>{content}</ScreenContainer>
 *
 * For game screens:
 *   <ScreenContainer flex game>{content}</ScreenContainer>
 */
export default function ScreenContainer({ children, flex, game }: ScreenContainerProps) {
  const { contentWidth, gameWidth } = useLayout();
  const maxWidth = game ? gameWidth : contentWidth;
  const flexStyle: ViewStyle | undefined = flex ? { flex: 1 } : undefined;

  return (
    <View style={[styles.wrapper, { maxWidth }, flexStyle]}>
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
