import { Audio, AVPlaybackSource } from 'expo-av';
import * as Haptics from 'expo-haptics';

// Bundled sound assets - loaded once, reused across plays
const SOUNDS = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  start: require('../../assets/sounds/start.wav'),
  celebration: require('../../assets/sounds/celebration.wav'),
} as const;

let soundsEnabled = true;

export function setSoundsEnabled(enabled: boolean) {
  soundsEnabled = enabled;
}

// Haptic feedback
export async function hapticCorrect() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics not available (e.g., simulator)
  }
}

export async function hapticWrong() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

export async function hapticTap() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export async function hapticHeavy() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

// Play a bundled sound asset
async function playSound(source: AVPlaybackSource, volume: number = 0.5) {
  if (!soundsEnabled) return;

  try {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume,
    });

    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {
    // Sound not available on this device
  }
}

export async function playCorrectSound() {
  await playSound(SOUNDS.correct, 0.4);
}

export async function playWrongSound() {
  await playSound(SOUNDS.wrong, 0.3);
}

export async function playCountdownBeep() {
  await playSound(SOUNDS.tick, 0.25);
}

export async function playGameStartSound() {
  await playSound(SOUNDS.start, 0.35);
}

export async function playCelebrationSound() {
  await playSound(SOUNDS.celebration, 0.5);
}

// Initialize audio mode
export async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // Audio not available
  }
}
