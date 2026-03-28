import { useCallback, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayback } from '@/context/PlaybackContext'

// Momentum 0–1 per minute, minute 0–90
const momentumData: { minute: number; value: number }[] = [
  { minute: 0,  value: 0.30 },
  { minute: 1,  value: 0.33 },
  { minute: 2,  value: 0.38 },
  { minute: 3,  value: 0.44 },
  { minute: 4,  value: 0.50 },
  { minute: 5,  value: 0.55 },
  { minute: 6,  value: 0.60 },
  { minute: 7,  value: 0.63 },
  { minute: 8,  value: 0.65 },
  { minute: 9,  value: 0.62 },
  { minute: 10, value: 0.58 },
  { minute: 11, value: 0.53 },
  { minute: 12, value: 0.48 },
  { minute: 13, value: 0.44 },
  { minute: 14, value: 0.41 },
  { minute: 15, value: 0.38 },
  { minute: 16, value: 0.36 },
  { minute: 17, value: 0.34 },
  { minute: 18, value: 0.32 },
  { minute: 19, value: 0.30 },
  { minute: 20, value: 0.28 },
  { minute: 21, value: 0.26 },
  { minute: 22, value: 0.24 },
  { minute: 23, value: 0.22 },
  { minute: 24, value: 0.21 },
  { minute: 25, value: 0.20 },
  { minute: 26, value: 0.20 },
  { minute: 27, value: 0.19 },
  { minute: 28, value: 0.18 },
  { minute: 29, value: 0.17 },
  { minute: 30, value: 0.16 },
  { minute: 31, value: 0.17 },
  { minute: 32, value: 0.19 },
  { minute: 33, value: 0.22 },
  { minute: 34, value: 0.26 },
  { minute: 35, value: 0.30 },
  { minute: 36, value: 0.35 },
  { minute: 37, value: 0.40 },
  { minute: 38, value: 0.45 },
  { minute: 39, value: 0.50 },
  { minute: 40, value: 0.54 },
  { minute: 41, value: 0.57 },
  { minute: 42, value: 0.60 },
  { minute: 43, value: 0.62 },
  { minute: 44, value: 0.64 },
  { minute: 45, value: 0.65 },
  { minute: 46, value: 0.68 },
  { minute: 47, value: 0.72 },
  { minute: 48, value: 0.75 },
  { minute: 49, value: 0.78 },
  { minute: 50, value: 0.80 },
  { minute: 51, value: 0.82 },
  { minute: 52, value: 0.83 },
  { minute: 53, value: 0.84 },
  { minute: 54, value: 0.84 },
  { minute: 55, value: 0.83 },
  { minute: 56, value: 0.80 },
  { minute: 57, value: 0.75 },
  { minute: 58, value: 0.69 },
  { minute: 59, value: 0.63 },
  { minute: 60, value: 0.57 },
  { minute: 61, value: 0.52 },
  { minute: 62, value: 0.47 },
  { minute: 63, value: 0.43 },
  { minute: 64, value: 0.40 },
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
  { minute: 75, value: 0.20 },
  { minute: 76, value: 0.22 },
  { minute: 77, value: 0.26 },
  { minute: 78, value: 0.30 },
  { minute: 79, value: 0.35 },
  { minute: 80, value: 0.40 },
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

function toX(minute: number) {
  return (minute / 90) * W
}
function toY(value: number) {
  return baseY - value * chartH
}

const pts = momentumData.map((d) => ({ x: toX(d.minute), y: toY(d.value) }))
const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
const last = pts[pts.length - 1]!
const first = pts[0]!
const areaPoints = `${polyline} ${last.x},${baseY} ${first.x},${baseY}`

const tickMinutes = [0, 15, 30, 45, 60, 75, 90]

/** Chart x ∈ [0, W] → bundle frame index (10 Hz timeline). */
function xToFrameIndex(x: number, playbackFrameCount: number) {
  if (playbackFrameCount <= 0) return 0
  const f = Math.max(0, Math.min(1, x / W))
  const max = playbackFrameCount - 1
  return Math.min(max, Math.floor(f * playbackFrameCount))
}

/** Bundle frame → x on chart (linear over full timeline). */
function frameIndexToX(frameIndex: number, playbackFrameCount: number) {
  if (playbackFrameCount <= 1) return 0
  const f = frameIndex / (playbackFrameCount - 1)
  return f * W
}

/** Match clock aligned to chart 0–90′: wall time from scrub position. */
function formatClockFromChartX(x: number) {
  const f = Math.max(0, Math.min(1, x / W))
  const totalSeconds = f * 90 * 60
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Wall time from bundle frame at 10 Hz (for playhead label). */
function formatClockFromFrame(frameIndex: number) {
  const totalSeconds = frameIndex / 10
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function MomentumChart() {
  const {
    frameIndex,
    playbackFrameCount,
    jumpToFrame,
    isPlaying,
    pause,
    resume,
  } = usePlayback()
  const [hoverX, setHoverX] = useState<number | null>(null)
  /** Hit target for x-mapping (track only; same width as SVG). */
  const trackRef = useRef<HTMLDivElement>(null)

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
    const x = clientToSvgX(e.clientX)
    jumpToFrame(xToFrameIndex(x, playbackFrameCount))
  }

  const playX =
    playbackFrameCount > 1
      ? frameIndexToX(frameIndex, playbackFrameCount)
      : playbackFrameCount === 1
        ? W / 2
        : null

  const hoverFrame =
    hoverX != null && playbackFrameCount > 0
      ? xToFrameIndex(hoverX, playbackFrameCount)
      : null

  const hoverPct = hoverX != null ? (hoverX / W) * 100 : null

  const matchClockLabel =
    playbackFrameCount > 0 ? formatClockFromFrame(frameIndex) : '—'

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
        <defs>
          <linearGradient id="momentumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* half-time dashed line */}
        <line
          x1={toX(45)} y1={PAD_TOP}
          x2={toX(45)} y2={baseY}
          stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3"
        />

        {/* filled area */}
        <polygon points={areaPoints} fill="url(#momentumGrad)" />

        {/* line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#a855f7"
          strokeWidth="2"
          strokeOpacity="0.8"
          strokeLinejoin="round"
        />

        {/* Current playback (10 Hz timeline) */}
        {playX != null && playbackFrameCount > 0 && (
          <g pointerEvents="none">
            <line
              x1={playX} y1={PAD_TOP}
              x2={playX} y2={baseY}
              stroke="hsl(var(--foreground))"
              strokeWidth="1.25"
              strokeOpacity="0.55"
            />
            <text
              x={playX}
              y={PAD_TOP - 1}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="10"
              opacity={0.75}
              className="tabular-nums"
            >
              {formatClockFromFrame(frameIndex)}
            </text>
          </g>
        )}

      </svg>

        {/* HTML/CSS playhead — theme colors + outline so it reads on the purple fill */}
        {hoverPct != null && hoverX != null && (
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
                  {formatClockFromChartX(hoverX)}
                  {hoverFrame != null && (
                    <span className="font-normal text-muted-foreground">
                      {` · f${hoverFrame}`}
                    </span>
                  )}
                </span>
                <div
                  className="h-0 w-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-foreground"
                  style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.35))' }}
                />
              </div>
              <div className="min-h-[24px] w-[3px] flex-1 rounded-[1px] bg-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
        )}
      </div>

      {/* x-axis labels as HTML so they're never clipped */}
      <div className="relative w-full h-5 mt-1">
        {tickMinutes.map((m) => (
          <span
            key={m}
            className="absolute text-xs text-muted-foreground -translate-x-1/2"
            style={{ left: `${(m / 90) * 100}%` }}
          >
            {m}'
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
