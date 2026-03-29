import { useCallback, useMemo, useState } from 'react'
import { Link2, Play } from 'lucide-react'
import { usePlayback } from '@/context/PlaybackContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  className?: string
}

export function VideoPlayer({ timeline, className }: Props) {
  const { frameIndex } = usePlayback()
  const [embedLoaded, setEmbedLoaded] = useState(false)
  const [embedStartTime, setEmbedStartTime] = useState(VIDEO_KICKOFF_START_TIME)
  const [embedNonce, setEmbedNonce] = useState(0)

  const mappedStartSeconds = useMemo(
    () => videoEmbedStartSeconds(frameIndex, timeline),
    [frameIndex, timeline],
  )

  const openEmbed = useCallback(
    (startTime: number) => {
      setEmbedStartTime(startTime)
      setEmbedNonce((n) => n + 1)
      setEmbedLoaded(true)
    },
    [],
  )

  const handleLoadVideo = useCallback(() => {
    openEmbed(mappedStartSeconds)
  }, [mappedStartSeconds, openEmbed])

  const handleSync = useCallback(() => {
    openEmbed(mappedStartSeconds)
  }, [mappedStartSeconds, openEmbed])

  const src = useMemo(() => {
    const params = new URLSearchParams({
      urn: VIDEO_URN,
      startTime: String(embedStartTime),
      subdivisions: 'false',
    })
    return `https://www.srf.ch/play/embed?${params.toString()}`
  }, [embedStartTime])

  return (
    <div
      className={cn(
        'relative flex h-full min-h-[14rem] w-full flex-col overflow-hidden rounded-xl border border-border/70',
        className,
      )}
      style={{
        backgroundColor: 'var(--video-well)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      {!embedLoaded ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <p className="max-w-[22rem] text-[13px] leading-relaxed text-muted-foreground">
            The SRF player loads only after you start it. Use sync after load to jump the
            broadcast to the same match moment as the timeline.
          </p>
          <Button type="button" size="default" onClick={handleLoadVideo}>
            <Play className="mr-2 size-4" aria-hidden />
            Load broadcast
          </Button>
        </div>
      ) : (
        <>
          <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-background/85 shadow-sm backdrop-blur-sm"
              onClick={handleSync}
            >
              <Link2 className="mr-1.5 size-3.5" aria-hidden />
              Sync to current frame
            </Button>
          </div>
          <iframe
            key={`${embedStartTime}-${embedNonce}`}
            title="SRF match video"
            className="h-full min-h-0 w-full flex-1 border-0"
            src={src}
            allowFullScreen
            allow="geolocation *; autoplay; encrypted-media"
          />
        </>
      )}
    </div>
  )
}
