import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  clampPlaybackSpeed,
  PLAYBACK_FRAME_MS,
  PLAYBACK_SPEED_DEFAULT,
} from '@/lib/playback'

/**
 * Current phase (order index into `phaseBreakdownPhases.json` → `phases`) and bundle frame index
 * (index into `MatchBundle.frames`, same as Python analyzers use for `analyze_frame`).
 */
export type PlaybackIndicator = {
  phaseIndex: number
  frameIndex: number
}

type PlaybackContextValue = PlaybackIndicator & {
  indicator: PlaybackIndicator
  setPhaseIndex: Dispatch<SetStateAction<number>>
  setFrameIndex: Dispatch<SetStateAction<number>>
  /** Length of the loaded tracking/bundle timeline (0 until a source sets it). */
  playbackFrameCount: number
  setPlaybackFrameCount: Dispatch<SetStateAction<number>>
  isPlaying: boolean
  pause: () => void
  resume: () => void
  jumpToFrame: (frameIndex: number) => void
  /** Wall-clock multiplier for frame stepping (0.2–2). */
  playbackSpeed: number
  setPlaybackSpeed: Dispatch<SetStateAction<number>>
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null)

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playbackFrameCount, setPlaybackFrameCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackSpeed, setPlaybackSpeedState] = useState(PLAYBACK_SPEED_DEFAULT)

  const setPlaybackSpeed = useCallback((next: SetStateAction<number>) => {
    setPlaybackSpeedState((prev) => {
      const raw =
        typeof next === 'function' ? next(prev) : next
      return clampPlaybackSpeed(raw)
    })
  }, [])

  const jumpToFrame = useCallback(
    (index: number) => {
      const max = Math.max(0, playbackFrameCount - 1)
      const clamped =
        playbackFrameCount <= 0
          ? Math.max(0, Math.floor(index))
          : Math.max(0, Math.min(max, Math.floor(index)))
      setFrameIndex(clamped)
    },
    [playbackFrameCount],
  )

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const resume = useCallback(() => {
    setIsPlaying(true)
  }, [])

  useEffect(() => {
    if (playbackFrameCount <= 0) return
    setFrameIndex((i) => Math.min(i, playbackFrameCount - 1))
  }, [playbackFrameCount])

  useEffect(() => {
    if (!isPlaying || playbackFrameCount <= 0) return
    const intervalMs = PLAYBACK_FRAME_MS / playbackSpeed
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % playbackFrameCount)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [isPlaying, playbackFrameCount, playbackSpeed])

  const value = useMemo<PlaybackContextValue>(
    () => ({
      phaseIndex,
      frameIndex,
      indicator: { phaseIndex, frameIndex },
      setPhaseIndex,
      setFrameIndex,
      playbackFrameCount,
      setPlaybackFrameCount,
      isPlaying,
      pause,
      resume,
      jumpToFrame,
      playbackSpeed,
      setPlaybackSpeed,
    }),
    [
      phaseIndex,
      frameIndex,
      playbackFrameCount,
      isPlaying,
      pause,
      resume,
      jumpToFrame,
      playbackSpeed,
      setPlaybackSpeed,
    ],
  )

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext)
  if (ctx == null) {
    throw new Error('usePlayback must be used within a PlaybackProvider')
  }
  return ctx
}
