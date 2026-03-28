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

/**
 * Current phase (order index into `phaseBreakdownPhases.json` → `phases`) and bundle frame index
 * (index into `MatchBundle.frames`, same as Python analyzers use for `analyze_frame`).
 */
export type PlaybackIndicator = {
  phaseIndex: number
  frameIndex: number
}

/** Wall time between bundle frames when playing (10 Hz → 0.1 s per frame). */
export const PLAYBACK_FRAME_MS = 100

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
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null)

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playbackFrameCount, setPlaybackFrameCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

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
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % playbackFrameCount)
    }, PLAYBACK_FRAME_MS)
    return () => window.clearInterval(id)
  }, [isPlaying, playbackFrameCount])

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
    }),
    [
      phaseIndex,
      frameIndex,
      playbackFrameCount,
      isPlaying,
      pause,
      resume,
      jumpToFrame,
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
