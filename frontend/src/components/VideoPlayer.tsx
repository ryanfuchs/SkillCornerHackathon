import { useMemo } from 'react'
import { usePlayback } from '@/context/PlaybackContext'
import phaseBreakdownPhases from '@/data/phaseBreakdownPhases.json'

type PhaseRow = {
  secondStart?: number
  phaseOfPlay?: Record<string, unknown>
}

type PhasesPayload = {
  phases: PhaseRow[]
}

const phasesPayload = phaseBreakdownPhases as PhasesPayload

// SRF time (seconds) where first-half kickoff appears in the broadcast.
const VIDEO_KICKOFF_START_TIME = 2176
const VIDEO_URN = 'urn:swisstxt:video:srf:1837719'

function phaseStartSecond(phase: PhaseRow | undefined): number {
  if (!phase) return 0
  if (phase.phaseOfPlay && typeof phase.phaseOfPlay.second_start === 'number') {
    return phase.phaseOfPlay.second_start
  }
  if (typeof phase.secondStart === 'number') {
    return phase.secondStart
  }
  return 0
}

export function VideoPlayer() {
  const { phaseIndex } = usePlayback()
  const phases = phasesPayload.phases
  const n = phases.length
  const safePhase = n === 0 ? 0 : Math.min(Math.max(0, phaseIndex), n - 1)
  const phase = phases[safePhase]
  const second = phaseStartSecond(phase)

  const startTime = VIDEO_KICKOFF_START_TIME + second

  const src = useMemo(() => {
    const params = new URLSearchParams({
      urn: VIDEO_URN,
      startTime: String(startTime),
      subdivisions: 'false',
    })
    return `https://www.srf.ch/play/embed?${params.toString()}`
  }, [startTime])

  return (
    <div className="h-full min-h-[14rem] w-full overflow-hidden rounded-md border border-border/60 bg-black/20">
      <iframe
        key={startTime}
        title="SRF match video"
        className="h-full w-full"
        src={src}
        allowFullScreen
        allow="geolocation *; autoplay; encrypted-media"
      />
    </div>
  )
}
