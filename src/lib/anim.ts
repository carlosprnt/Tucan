import { Keyframe } from 'react-native-reanimated';

/**
 * Staggered entrance: opacity 0 -> 1 and scale 0.95 -> 1. Apply as an `entering`
 * animation on each item to make a list/grid appear in a quick cascade.
 */
export function cascadeIn(index: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.95 }] },
    100: { opacity: 1, transform: [{ scale: 1 }] },
  })
    .duration(200)
    .delay(Math.min(index, 60) * 8);
}
