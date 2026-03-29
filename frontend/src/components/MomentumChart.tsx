import { useCallback, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayback } from '@/context/PlaybackContext'
import type { MomentumTimeline } from '@/hooks/useMatchTracking'

// Momentum 0–1 per minute, minute 0–90 (placeholder curve sampled at broadcast minutes).
const momentumData: { minute: number; value: number }[] = [
  { minute: 0, value: 0.3 },
  { minute: 1, value: 0.33 },
  { minute: 2, value: 0.38 },
  { minute: 3, value: 0.44 },
  { minute: 4, value: 0.5 },
  { minute: 5, value: 0.55 },
  { minute: 6, value: 0.6 },
  { minute: 7, value: 0.63 },
  { minute: 8, value: 0.65 },
  { minute: 9, value: 0.62 },
  { minute: 10, value: 0.58 },
  { minute: 11, value: 0.53 },
  { minute: 12, value: 0.48 },
  { minute: 13, value: 0.44 },
  { minute: 14, value: 0.41 },
  { minute: 15, value: 0.38 },
  { minute: 16, value: 0.36 },
  { minute: 17, value: 0.34 },
  { minute: 18, value: 0.32 },
  { minute: 19, value: 0.3 },
  { minute: 20, value: 0.28 },
  { minute: 21, value: 0.26 },
  { minute: 22, value: 0.24 },
  { minute: 23, value: 0.22 },
  { minute: 24, value: 0.21 },
  { minute: 25, value: 0.2 },
  { minute: 26, value: 0.2 },
  { minute: 27, value: 0.19 },
  { minute: 28, value: 0.18 },
  { minute: 29, value: 0.17 },
  { minute: 30, value: 0.16 },
  { minute: 31, value: 0.17 },
  { minute: 32, value: 0.19 },
  { minute: 33, value: 0.22 },
  { minute: 34, value: 0.26 },
  { minute: 35, value: 0.3 },
  { minute: 36, value: 0.35 },
  { minute: 37, value: 0.4 },
  { minute: 38, value: 0.45 },
  { minute: 39, value: 0.5 },
  { minute: 40, value: 0.54 },
  { minute: 41, value: 0.57 },
  { minute: 42, value: 0.6 },
  { minute: 43, value: 0.62 },
  { minute: 44, value: 0.64 },
  { minute: 45, value: 0.65 },
  { minute: 46, value: 0.68 },
  { minute: 47, value: 0.72 },
  { minute: 48, value: 0.75 },
  { minute: 49, value: 0.78 },
  { minute: 50, value: 0.8 },
  { minute: 51, value: 0.82 },
  { minute: 52, value: 0.83 },
  { minute: 53, value: 0.84 },
  { minute: 54, value: 0.84 },
  { minute: 55, value: 0.83 },
  { minute: 56, value: 0.8 },
  { minute: 57, value: 0.75 },
  { minute: 58, value: 0.69 },
  { minute: 59, value: 0.63 },
  { minute: 60, value: 0.57 },
  { minute: 61, value: 0.52 },
  { minute: 62, value: 0.47 },
  { minute: 63, value: 0.43 },
  { minute: 64, value: 0.4 },
  { minute: 65, value: 0.37 },
  { minute: 66, value: 0.34 },
  { minute: 67, value: 0.31 },
  { minute: 68, value: 0.29 },
  { minute: 69, value: 0.27 },
  { minute: 70, value: 0.25 },
  { minute: 71, value: 0.24 },
  { minute: 72, value: 0.22 },
  { minute: 73, value: 0.21 },
  { minute: 74, value: 0.21 },
  { minute: 75, value: 0.2 },
  { minute: 76, value: 0.22 },
  { minute: 77, value: 0.26 },
  { minute: 78, value: 0.3 },
  { minute: 79, value: 0.35 },
  { minute: 80, value: 0.4 },
  { minute: 81, value: 0.44 },
  { minute: 82, value: 0.47 },
  { minute: 83, value: 0.49 },
  { minute: 84, value: 0.51 },
  { minute: 85, value: 0.52 },
  { minute: 86, value: 0.53 },
  { minute: 87, value: 0.54 },
  { minute: 88, value: 0.54 },
  { minute: 89, value: 0.55 },
  { minute: 90, value: 0.55 },
]

const W = 800
const H = 100
const PAD_TOP = 8
const chartH = H - PAD_TOP
const baseY = PAD_TOP + chartH

/** Extra top space in viewBox for labels (playback timecode). */
const VIEW_TOP = 20
const VIEW_BOX = `-2 -${VIEW_TOP} ${W + 4} ${H + VIEW_TOP + 2}` as const
const TRACK_PX = H + VIEW_TOP

const STRIDE = 6

function toY(value: number) {
  return baseY - value * chartH
}

function momentumValueAtMatchMinute(matchMinute: number): number {
  const i = Math.min(90, Math.max(0, Math.round(matchMinute)))
  return momentumData[i]!.value
}

function buildLinePaths(
  timeline: MomentumTimeline,
): { d1: string; d2: string } {
  const { chartT, matchMinutes, p1s, p1e, p2s, p2e } = timeline
  const seg1: string[] = []
  const seg2: string[] = []

  const pushPoint = (
    bucket: string[],
    i: number,
    isFirst: { v: boolean },
  ) => {
    const m = matchMinutes[i]!
    if (m < 0) return
    const x = chartT[i]! * W
    const y = toY(momentumValueAtMatchMinute(m))
    if (isFirst.v) {
      bucket.push(`M ${x} ${y}`)
      isFirst.v = false
    } else bucket.push(`L ${x} ${y}`)
  }

  const first1 = { v: true }
  for (let i = p1s; i <= p1e; i += STRIDE) pushPoint(seg1, i, first1)
  if (p1e >= p1s && (p1e - p1s) % STRIDE !== 0) pushPoint(seg1, p1e, first1)

  const first2 = { v: true }
  for (let i = p2s; i <= p2e; i += STRIDE) pushPoint(seg2, i, first2)
  if (p2e >= p2s && (p2e - p2s) % STRIDE !== 0) pushPoint(seg2, p2e, first2)

  return { d1: seg1.join(' '), d2: seg2.join(' ') }
}

type Props = {
  timeline: MomentumTimeline | null
}

export function MomentumChart({ timeline }: Props) {
  const {
    frameIndex,
    playbackFrameCount,
    jumpToFrame,
    isPlaying,
    pause,
    resume,
  } = usePlayback()
  const [hoverX, setHoverX] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const linePaths = useMemo(
    () => (timeline ? buildLinePaths(timeline) : { d1: '', d2: '' }),
    [timeline],
  )

  const w1Px = timeline ? timeline.w1Norm * W : W * 0.5

  const halfTicks = useMemo(() => {
    if (!timeline) return []
    const { w1Norm, duration1Min, duration2Min } = timeline
    const markFirstHalf = [1, 15, 30, 45]
    /** Broadcast minute marks (45′ kickoff of 2H through 90′). */
    const markSecondHalfBroadcast = [45, 60, 75, 90]
    const out: { key: string; label: string; pct: number }[] = []
    const d1 = Math.max(duration1Min, 0.01)
    const d2 = Math.max(duration2Min, 0.01)
    for (const tm of markFirstHalf) {
      const t01 = Math.min(1, (tm / d1) * w1Norm)
      out.push({ key: `h1-${tm}`, label: `${tm}'`, pct: t01 * 100 })
    }
    for (const bm of markSecondHalfBroadcast) {
      const offsetIn2H = bm - 45
      const t01 = Math.min(
        1,
        w1Norm + (offsetIn2H / d2) * (1 - w1Norm),
      )
      out.push({ key: `h2-${bm}`, label: `${bm}'`, pct: t01 * 100 })
    }
    return out
  }, [timeline])

  const clientToSvgX = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return 0
    const t = (clientX - rect.left) / rect.width
    return Math.max(0, Math.min(W, t * W))
  }, [])

  const onChartMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setHoverX(clientToSvgX(e.clientX))
  }
  const onChartLeave = () => setHoverX(null)

  const onChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline || playbackFrameCount <= 0) return
    const x = clientToSvgX(e.clientX)
    const t01 = x / W
    jumpToFrame(timeline.frameIndexAtChartT(t01))
  }

  const playT01 =
    timeline && playbackFrameCount > 0
      ? timeline.chartT[Math.min(frameIndex, timeline.chartT.length - 1)]!
      : null
  const playX =
    playT01 != null && playbackFrameCount > 0
      ? playT01 * W
      : playbackFrameCount === 1
        ? W / 2
        : null

  const hoverFrame =
    hoverX != null && timeline && playbackFrameCount > 0
      ? timeline.frameIndexAtChartT(hoverX / W)
      : null

  const hoverPct = hoverX != null ? (hoverX / W) * 100 : null

  const matchClockLabel =
    timeline && playbackFrameCount > 0
      ? timeline.formatClockForFrame(frameIndex)
      : '—'

  return (
    <div
      ref={trackRef}
      className="w-4/5 mx-auto mt-6 cursor-crosshair touch-none select-none"
      onMouseMove={onChartMove}
      onMouseLeave={onChartLeave}
      onClick={onChartClick}
    >
      <div className="relative w-full" style={{ height: TRACK_PX }}>
        <svg
          viewBox={VIEW_BOX}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 block overflow-visible"
        >
          {/* Half-time boundary */}
          {timeline ? (
            <line
              x1={w1Px}
              y1={PAD_TOP}
              x2={w1Px}
              y2={baseY}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          ) : null}

          {linePaths.d1 ? (
            <path
              d={linePaths.d1}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="1.75"
              strokeOpacity="0.85"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
          ) : null}
          {linePaths.d2 ? (
            <path
              d={linePaths.d2}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="1.75"
              strokeOpacity="0.85"
              strokeLinecap="round"
              strokeLinejoin="miter"
            />
          ) : null}

          {playX != null && playbackFrameCount > 0 && timeline ? (
            <g pointerEvents="none">
              <line
                x1={playX}
                y1={PAD_TOP}
                x2={playX}
                y2={baseY}
                stroke="var(--foreground)"
                strokeWidth="1.25"
                strokeOpacity="0.55"
              />
              <text
                x={playX}
                y={PAD_TOP - 1}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize="10"
                opacity={0.75}
                className="tabular-nums"
              >
                {timeline.formatClockForFrame(frameIndex)}
              </text>
            </g>
          ) : null}
        </svg>

        {hoverPct != null && hoverX != null && timeline ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 overflow-visible"
            aria-hidden
          >
            <div
              className="absolute top-0 bottom-0 flex min-h-0 w-0 flex-col items-center"
              style={{
                left: `${hoverPct}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="mb-0.5 flex shrink-0 flex-col items-center">
                <span className="whitespace-nowrap rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm ring-1 ring-border/80">
                  {hoverFrame != null
                    ? timeline.formatClockForFrame(hoverFrame)
                    : '—'}
                  {hoverFrame != null ? (
                    <span className="font-normal text-muted-foreground">
                      {` · f${hoverFrame}`}
                    </span>
                  ) : null}
                </span>
                <div
                  className="h-0 w-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-foreground"
                  style={{
                    filter:
                      'drop-shadow(0 1px 0 color-mix(in srgb, var(--foreground) 35%, transparent))',
                  }}
                />
              </div>
              <div
                className="min-h-[24px] w-[3px] flex-1 rounded-[1px] bg-foreground"
                style={{
                  boxShadow:
                    '0 0 0 1px color-mix(in srgb, var(--foreground) 42%, transparent)',
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative w-full h-5 mt-1">
        {halfTicks.map((tk) => (
          <span
            key={tk.key}
            className="absolute text-xs text-muted-foreground -translate-x-1/2"
            style={{ left: `${tk.pct}%` }}
          >
            {tk.label}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <p
          className="text-sm font-medium tabular-nums text-foreground tracking-tight"
          aria-live="polite"
        >
          {matchClockLabel}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          disabled={playbackFrameCount === 0}
          aria-label={isPlaying ? 'Pause' : 'Resume'}
          aria-pressed={isPlaying}
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) pause()
            else resume()
          }}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
