import {
  createContext,
  useContext,
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

type PlaybackContextValue = PlaybackIndicator & {
  indicator: PlaybackIndicator
  setPhaseIndex: Dispatch<SetStateAction<number>>
  setFrameIndex: Dispatch<SetStateAction<number>>
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null)

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)

  const value = useMemo<PlaybackContextValue>(
    () => ({
      phaseIndex,
      frameIndex,
      indicator: { phaseIndex, frameIndex },
      setPhaseIndex,
      setFrameIndex,
    }),
    [phaseIndex, frameIndex],
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
