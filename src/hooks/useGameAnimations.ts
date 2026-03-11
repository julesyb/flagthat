import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export function useGameAnimations() {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const streakScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const animateStreak = useCallback(() => {
    streakScale.setValue(1.5);
    Animated.spring(streakScale, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [streakScale]);

  const animateWrong = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const animateTransition = useCallback((onMidpoint?: () => void) => {
    fadeAnim.setValue(1);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onMidpoint?.();
      // Small delay to allow new image to start loading before fading in
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 50);
    });
  }, [fadeAnim]);

  return {
    fadeAnim,
    streakScale,
    shakeAnim,
    animateStreak,
    animateWrong,
    animateTransition,
  };
}
