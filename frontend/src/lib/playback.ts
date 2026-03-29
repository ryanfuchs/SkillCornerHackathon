/** Wall time between bundle frames at 1× speed (10 Hz → 0.1 s per frame). */
export const PLAYBACK_FRAME_MS = 100

/** Playback rate: 1 = real-time @ 10 Hz. */
export const PLAYBACK_SPEED_MIN = 0.2
export const PLAYBACK_SPEED_MAX = 2
export const PLAYBACK_SPEED_DEFAULT = 1

/** Presets for the speed control (within [PLAYBACK_SPEED_MIN, PLAYBACK_SPEED_MAX]). */
export const PLAYBACK_SPEED_OPTIONS = [
  0.2, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2,
] as const

export function clampPlaybackSpeed(value: number): number {
  const rounded = Math.round(value * 100) / 100
  return Math.min(
    PLAYBACK_SPEED_MAX,
    Math.max(PLAYBACK_SPEED_MIN, rounded),
  )
}
