import { useCallback, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayback } from '@/context/PlaybackContext'
import type { MomentumTimeline } from '@/hooks/useMatchTracking'
import { cn } from '@/lib/utils'
import keyMoments from '@/data/timelineKeyMoments.json'

type MomentKind = 'goal' | 'shot'

type MomentRow = {
  frame: number
  label: string
  kind: MomentKind
}

const payload = keyMoments as {
  matchId: number
  moments: MomentRow[]
}

type Props = {
  timeline: MomentumTimeline | null
  className?: string
}

function momentColor(kind: MomentKind): string {
  if (kind === 'goal') return 'var(--destructive)'
  return 'var(--primary)'
}

export function MatchTimeline({ timeline, className }: Props) {
  const {
    frameIndex,
    playbackFrameCount,
    jumpToFrame,
    isPlaying,
    pause,
    resume,
  } = usePlayback()
  const trackRef = useRef<HTMLDivElement>(null)
  const [hoverT, setHoverT] = useState<number | null>(null)
  const [hoverMoment, setHoverMoment] = useState<MomentRow | null>(null)

  const moments = useMemo(() => {
    if (!timeline) return [] as Array<MomentRow & { t: number }>
    const out: Array<MomentRow & { t: number }> = []
    for (const m of payload.moments) {
      const t = timeline.chartTForBundleFrame(m.frame)
      if (t == null) continue
      out.push({ ...m, t })
    }
    return out
  }, [timeline])

  const playT =
    timeline && playbackFrameCount > 0
      ? timeline.chartT[
          Math.min(frameIndex, timeline.chartT.length - 1)
        ]!
      : null

  const clientToT01 = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return 0
    const x = clientX - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }, [])

  const onTrackPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timeline || playbackFrameCount <= 0) return
    const t01 = clientToT01(e.clientX)
    jumpToFrame(timeline.frameIndexAtChartT(t01))
  }

  const onTrackMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline) return
    setHoverT(clientToT01(e.clientX))
  }

  const onTrackLeave = () => {
    setHoverT(null)
  }

  const w1Pct = timeline ? timeline.w1Norm * 100 : 50

  const matchClockLabel =
    timeline && playbackFrameCount > 0
      ? timeline.formatClockForFrame(frameIndex)
      : '—'

  return (
    <div className={cn('flex flex-col gap-3 select-none', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-medium tabular-nums text-[var(--muted-foreground)] sm:text-[11px]">
            <span>Kickoff</span>
            <span className="opacity-90">Half</span>
            <span>Full time</span>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] p-3 sm:p-4">
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                playT != null ? Math.round(playT * 100) : 0
              }
              aria-label="Match timeline"
              className="relative h-16 w-full cursor-ew-resize touch-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:h-[4.25rem]"
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return
                e.currentTarget.setPointerCapture(e.pointerId)
                onTrackPointer(e)
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1 && e.pointerType === 'mouse') return
                if (e.pressure > 0 || e.buttons === 1) onTrackPointer(e)
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return
                if (!timeline || playbackFrameCount <= 0) return
                jumpToFrame(
                  timeline.frameIndexAtChartT(clientToT01(e.clientX)),
                )
              }}
              onMouseMove={onTrackMove}
              onMouseLeave={onTrackLeave}
              onKeyDown={(e) => {
                if (!timeline || playbackFrameCount <= 0) return
                const step = 0.002
                const cur =
                  timeline.chartT[
                    Math.min(frameIndex, timeline.chartT.length - 1)
                  ]!
                if (
                  e.key === 'ArrowRight' ||
                  e.key === 'ArrowDown'
                ) {
                  e.preventDefault()
                  jumpToFrame(timeline.frameIndexAtChartT(cur + step))
                } else if (
                  e.key === 'ArrowLeft' ||
                  e.key === 'ArrowUp'
                ) {
                  e.preventDefault()
                  jumpToFrame(timeline.frameIndexAtChartT(cur - step))
                }
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--foreground)_22%,var(--border))]"
                aria-hidden
              />

              {timeline ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-[5] w-px -translate-x-1/2 bg-[var(--border)]"
                  style={{ left: `${w1Pct}%` }}
                  aria-hidden
                >
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    HT
                  </span>
                </div>
              ) : null}

              {moments.map((m) => (
                <button
                  key={`${m.frame}-${m.kind}`}
                  type="button"
                  title={m.label}
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-[var(--background)] shadow-sm transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                  style={{
                    left: `${m.t * 100}%`,
                    width: m.kind === 'goal' ? 12 : 9,
                    height: m.kind === 'goal' ? 12 : 9,
                    backgroundColor: momentColor(m.kind),
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const idx = timeline?.rowIndexForBundleFrame(m.frame)
                    if (idx != null) jumpToFrame(idx)
                  }}
                  onMouseEnter={() => setHoverMoment(m)}
                  onMouseLeave={() => setHoverMoment(null)}
                  aria-label={m.label}
                />
              ))}

              {playT != null && playbackFrameCount > 0 ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px -translate-x-1/2 bg-[var(--primary)]"
                  style={{ left: `${playT * 100}%` }}
                >
                  <div className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--background)] bg-[var(--primary)] shadow-sm" />
                </div>
              ) : null}

              {hoverT != null && timeline && playbackFrameCount > 0 ? (
                <div
                  className="pointer-events-none absolute bottom-full z-[15] mb-1 -translate-x-1/2 opacity-90"
                  style={{ left: `${hoverT * 100}%` }}
                >
                  <span className="whitespace-nowrap rounded-md bg-[var(--popover)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]">
                    {timeline.formatClockForFrame(
                      timeline.frameIndexAtChartT(hoverT),
                    )}
                  </span>
                </div>
              ) : null}

              {hoverMoment ? (
                <div className="pointer-events-none absolute left-0 right-0 top-full z-30 mt-1 rounded-lg bg-[var(--popover)] px-2 py-1.5 text-center text-[11px] leading-snug text-[var(--foreground)] shadow-md ring-1 ring-[var(--border)] sm:text-left">
                  <span className="font-semibold capitalize text-[var(--muted-foreground)]">
                    {hoverMoment.kind}
                  </span>
                  <span className="block text-[12px]">{hoverMoment.label}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="hidden w-[min(100%,13rem)] shrink-0 text-[11px] leading-snug text-[var(--muted-foreground)] sm:block">
          <p className="font-semibold text-[var(--foreground)]">Key moments</p>
          <p className="mt-1">
            Goals and shots from dynamic events (merged windows). Drag the bar
            or tap a dot to seek.
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: momentColor('goal') }}
              />
              Goal
            </li>
            <li className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: momentColor('shot') }}
              />
              Shot
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-0.5 shrink-0 rounded-full bg-[var(--primary)]" />
              Now
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <p
          className="text-sm font-medium tabular-nums tracking-tight text-[var(--foreground)]"
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
