import { useMemo } from 'react'
import { usePlayback } from '@/context/PlaybackContext'

// SRF time (seconds) where first-half kickoff appears in the broadcast.
const VIDEO_KICKOFF_START_TIME = 2176
const VIDEO_URN = 'urn:swisstxt:video:srf:1837719'

/** Match clock seconds since kickoff — must stay in sync with `MomentumChart` `formatClockFromFrame`. */
function matchClockSecondsFromFrameIndex(frameIndex: number) {
  return frameIndex / 10
}

export function VideoPlayer() {
  const { frameIndex } = usePlayback()

  const startTime = useMemo(() => {
    const matchSec = matchClockSecondsFromFrameIndex(frameIndex)
    return Math.round(VIDEO_KICKOFF_START_TIME + matchSec)
  }, [frameIndex])

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
