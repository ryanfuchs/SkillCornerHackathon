import { useMemo } from 'react'
import { usePlayback } from '@/context/PlaybackContext'
import type { MomentumTimeline } from '@/hooks/useMatchTracking'

// SRF embed time (seconds): first-half kickoff and second-half kickoff in the broadcast.
const VIDEO_KICKOFF_START_TIME = 2176
const VIDEO_SECOND_HALF_START_TIME = 6000
const BROADCAST_45_OFFSET_SEC = 45 * 60

/**
 * Map tracking frame → SRF `startTime` using real match clock from the timeline.
 * First half: linear from kickoff; second half: anchored at `VIDEO_SECOND_HALF_START_TIME`
 * so half-time gaps in the tracking stream do not drift the video.
 */
function videoEmbedStartSeconds(
  frameIndex: number,
  timeline: MomentumTimeline | null,
): number {
  if (!timeline) {
    return Math.round(VIDEO_KICKOFF_START_TIME + frameIndex / 10)
  }

  const { matchMinutes, p1e, p2s } = timeline
  const n = matchMinutes.length
  if (n === 0) {
    return Math.round(VIDEO_KICKOFF_START_TIME + frameIndex / 10)
  }

  const i = Math.min(Math.max(0, frameIndex), n - 1)
  const mm = matchMinutes[i]!

  if (i > p1e && i < p2s) {
    const mmEnd = matchMinutes[p1e]!
    if (mmEnd >= 0) {
      return Math.round(VIDEO_KICKOFF_START_TIME + mmEnd * 60)
    }
    return VIDEO_SECOND_HALF_START_TIME
  }

  if (i >= p2s) {
    if (mm < 0) return VIDEO_SECOND_HALF_START_TIME
    const matchSec = mm * 60
    return Math.round(
      VIDEO_SECOND_HALF_START_TIME + (matchSec - BROADCAST_45_OFFSET_SEC),
    )
  }

  if (mm < 0) return VIDEO_KICKOFF_START_TIME
  return Math.round(VIDEO_KICKOFF_START_TIME + mm * 60)
}

const VIDEO_URN = 'urn:swisstxt:video:srf:1837719'

type Props = {
  timeline: MomentumTimeline | null
}

export function VideoPlayer({ timeline }: Props) {
  const { frameIndex } = usePlayback()

  const startTime = useMemo(
    () => videoEmbedStartSeconds(frameIndex, timeline),
    [frameIndex, timeline],
  )

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
