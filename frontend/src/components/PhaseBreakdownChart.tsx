import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MouseHandlerDataParam } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayback } from '@/context/PlaybackContext'
import phaseBreakdownPhases from '@/data/phaseBreakdownPhases.json'
import phaseBreakdownFrames from '@/data/phaseBreakdownFrames.json'

type PhaseAnalysis = {
  mean: Record<string, number>
  max: Record<string, number>
  min: Record<string, number>
  frameCount: number
}

type PhaseOfPlayRow = Record<string, unknown>

/** New export shape: full CSV row under phaseOfPlay. */
type PhaseRecord = {
  orderIndex: number
  bundleStart: number | null
  bundleEnd: number | null
  phaseOfPlay: PhaseOfPlayRow
  analysis: PhaseAnalysis | null
}

/** Legacy flat phase meta (older single-file exports). */
type LegacyPhaseMeta = {
  orderIndex: number
  csvIndex?: number
  frameStart?: number
  frameEnd?: number
  bundleStart: number | null
  bundleEnd: number | null
  minuteStart?: number
  secondStart?: number
  period?: number
  phaseType?: string
  phaseOfPlay?: PhaseOfPlayRow
  analysis?: PhaseAnalysis | null
}

type SeriesRow = {
  bundleStart: number | null
  bundleEnd: number | null
  t: number[]
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
}

type FrameSeries = {
  trackingFrameIds: number[]
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
}

type PhasesPayload = {
  phases: (PhaseRecord | LegacyPhaseMeta)[]
  seriesByPhaseOrder: Record<string, SeriesRow>
  nFrames?: number
  frameSeriesLength?: number
  indicatorIds?: string[]
  phaseChartStride?: number
  precomputedPhaseOrderIndices?: number[]
  framesFile?: string
  matchId?: number
}

type FramesPayload = {
  matchId: number
  nFrames: number
  frameSeriesLength: number
  indicatorIds: string[]
  trackingFrameIds: number[]
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
  phasesFile?: string
}

const phasesPart = phaseBreakdownPhases as PhasesPayload
const framesPart = phaseBreakdownFrames as FramesPayload

const frameSeries: FrameSeries = {
  trackingFrameIds: framesPart.trackingFrameIds,
  player_clusters: framesPart.player_clusters,
  position_change: framesPart.position_change,
  ball_chaos: framesPart.ball_chaos,
  defensive_line: framesPart.defensive_line,
  line_to_line_acceleration: framesPart.line_to_line_acceleration,
}

const payload = {
  ...phasesPart,
  frameSeries,
}

/** Per-series fill: low enough that one band is subtle; overlaps read darker (src-over alpha). */
const AREA_FILL_OPACITY = 0.2

const INDICATOR_STYLES: { id: string; label: string; color: string }[] = [
  { id: 'player_clusters', label: 'Player clusters', color: '#a855f7' },
  { id: 'position_change', label: 'Position change', color: '#22c55e' },
  { id: 'ball_chaos', label: 'Ball chaos', color: '#f97316' },
  { id: 'defensive_line', label: 'Defensive line', color: '#38bdf8' },
  { id: 'line_to_line_acceleration', label: 'Line-to-line accel.', color: '#e11d48' },
]

const MOVING_WINDOW_FRAMES = 150

function isPhaseRecord(p: PhaseRecord | LegacyPhaseMeta): p is PhaseRecord {
  return p.phaseOfPlay != null && Object.keys(p.phaseOfPlay).length > 0
}

function phaseLabel(p: PhaseRecord | LegacyPhaseMeta) {
  if (isPhaseRecord(p)) {
    const row = p.phaseOfPlay
    const period = row.period as number
    const minute = row.minute_start as number
    const second = row.second_start as number
    const typ = String(row.team_in_possession_phase_type ?? '')
    return `P${period} ${minute}:${String(second).padStart(2, '0')} · ${typ}`
  }
  const l = p as LegacyPhaseMeta
  return `P${l.period ?? '?'} ${l.minuteStart ?? '?'}:${String(l.secondStart ?? 0).padStart(2, '0')} · ${l.phaseType ?? ''}`
}

function frameSeriesLength(fs: FrameSeries): number {
  return Math.min(
    fs.trackingFrameIds.length,
    fs.player_clusters.length,
    fs.position_change.length,
    fs.ball_chaos.length,
    fs.defensive_line.length,
    fs.line_to_line_acceleration.length,
  )
}

function chartRowsFromFrameWindow(
  fs: FrameSeries,
  windowStart: number,
  windowEnd: number,
  stride: number,
) {
  const len = frameSeriesLength(fs)
  if (len === 0 || windowStart >= len) return []
  const hi = Math.min(windowEnd, len - 1)
  const rows: Array<{
    frame: number
    player_clusters: number
    position_change: number
    ball_chaos: number
    defensive_line: number
    line_to_line_acceleration: number
  }> = []
  for (let i = windowStart; i <= hi; i += stride) {
    rows.push({
      frame: i,
      player_clusters: fs.player_clusters[i] ?? 0,
      position_change: fs.position_change[i] ?? 0,
      ball_chaos: fs.ball_chaos[i] ?? 0,
      defensive_line: fs.defensive_line[i] ?? 0,
      line_to_line_acceleration: fs.line_to_line_acceleration[i] ?? 0,
    })
  }
  return rows
}

type ChartRow = ReturnType<typeof chartRowsFromFrameWindow>[number]

function frameIndexFromHoverState(
  state: MouseHandlerDataParam,
  rows: ChartRow[],
  frameStart: number,
  frameEnd: number,
): number | null {
  if (rows.length === 0) return null
  const idx = state.activeTooltipIndex
  if (typeof idx === 'number' && idx >= 0 && idx < rows.length) {
    const frame = rows[idx]!.frame
    return Math.max(frameStart, Math.min(frameEnd, frame))
  }
  const label = state.activeLabel
  if (typeof label === 'number' && Number.isFinite(label)) {
    return Math.max(frameStart, Math.min(frameEnd, Math.round(label)))
  }
  if (typeof label === 'string' && label !== '') {
    const n = Number(label)
    if (Number.isFinite(n)) {
      return Math.max(frameStart, Math.min(frameEnd, Math.round(n)))
    }
  }
  return null
}

/** Which exported phase (order index) contains this bundle frame; gaps map to nearest timeline phase. */
function phaseOrderIndexForBundleFrame(
  phases: (PhaseRecord | LegacyPhaseMeta)[],
  frame: number,
): number {
  const n = phases.length
  if (n === 0) return 0

  for (let i = 0; i < n; i++) {
    const p = phases[i]!
    const lo = p.bundleStart
    const hi = p.bundleEnd
    if (lo != null && hi != null && frame >= lo && frame <= hi) return i
  }

  const first = phases[0]!
  if (first.bundleStart != null && frame < first.bundleStart) return 0

  const last = phases[n - 1]!
  if (last.bundleEnd != null && frame > last.bundleEnd) return n - 1

  let best = 0
  for (let i = 0; i < n; i++) {
    const p = phases[i]!
    if (p.bundleStart != null && p.bundleStart <= frame) best = i
  }
  return best
}

export function PhaseBreakdownChart() {
  const {
    phaseIndex,
    frameIndex,
    setPhaseIndex,
    jumpToFrame,
    pause,
    resume,
    isPlaying,
  } = usePlayback()
  const wasPlayingBeforeScrubRef = useRef(true)
  const [hoverWindowCenterFrame, setHoverWindowCenterFrame] = useState<number | null>(null)
  const phases = payload.phases
  const n = phases.length
  const frameSeries = payload.frameSeries
  const chartStride = payload.phaseChartStride ?? 1

  const safePhase = n === 0 ? 0 : Math.min(Math.max(0, phaseIndex), n - 1);

  useEffect(() => {
    if (safePhase !== phaseIndex) {
      setPhaseIndex(safePhase);
    }
  }, [phaseIndex, safePhase, setPhaseIndex]);

  useEffect(() => {
    if (n === 0) return
    const want = phaseOrderIndexForBundleFrame(phases, frameIndex)
    setPhaseIndex((cur) => (cur === want ? cur : want))
  }, [frameIndex, n, phases, setPhaseIndex])

  const phase = phases[safePhase]
  const goToPhase = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(n - 1, nextIndex))
      setPhaseIndex(clamped)
      const p = phases[clamped]
      if (p?.bundleStart != null) jumpToFrame(p.bundleStart)
    },
    [jumpToFrame, n, phases, setPhaseIndex],
  )
  const totalFrames = frameSeriesLength(frameSeries)

  const activeWindowCenterFrame =
    hoverWindowCenterFrame != null && totalFrames > 0
      ? Math.max(0, Math.min(totalFrames - 1, hoverWindowCenterFrame))
      : totalFrames > 0
        ? Math.max(0, Math.min(totalFrames - 1, frameIndex))
        : 0

  const { windowStart, windowEnd } = useMemo(() => {
    if (totalFrames <= 0) {
      return { windowStart: 0, windowEnd: -1 }
    }
    const windowSize = Math.max(2, MOVING_WINDOW_FRAMES)
    const half = Math.floor(windowSize / 2)
    const maxStart = Math.max(0, totalFrames - windowSize)
    const start = Math.max(0, Math.min(maxStart, activeWindowCenterFrame - half))
    const end = Math.min(totalFrames - 1, start + windowSize - 1)
    return { windowStart: start, windowEnd: end }
  }, [activeWindowCenterFrame, totalFrames])

  const chartData = useMemo(
    () =>
      chartRowsFromFrameWindow(
        frameSeries,
        windowStart,
        windowEnd,
        Math.max(1, chartStride),
      ),
    [chartStride, frameSeries, windowEnd, windowStart],
  )

  const bundleStart = phase?.bundleStart ?? null
  const bundleEnd = phase?.bundleEnd ?? null

  const safeFrameIndex =
    totalFrames > 0 ? Math.max(0, Math.min(totalFrames - 1, frameIndex)) : null

  const frameStartEnd =
    isPhaseRecord(phase) && phase.phaseOfPlay
      ? {
          frameStart: phase.phaseOfPlay.frame_start as number,
          frameEnd: phase.phaseOfPlay.frame_end as number,
        }
      : {
          frameStart: (phase as LegacyPhaseMeta).frameStart,
          frameEnd: (phase as LegacyPhaseMeta).frameEnd,
        };

  const boundaryMarkers = useMemo(() => {
    if (windowEnd < windowStart) return []
    const markers: Array<{ key: string; x: number; kind: 'start' | 'end' }> = []
    for (const p of phases) {
      if (p.bundleStart != null && p.bundleStart >= windowStart && p.bundleStart <= windowEnd) {
        markers.push({ key: `start-${p.orderIndex}`, x: p.bundleStart, kind: 'start' })
      }
      if (p.bundleEnd != null && p.bundleEnd >= windowStart && p.bundleEnd <= windowEnd) {
        markers.push({ key: `end-${p.orderIndex}`, x: p.bundleEnd, kind: 'end' })
      }
    }
    return markers
  }, [phases, windowEnd, windowStart])

  const handleChartMouseMove = useCallback(
    (state: MouseHandlerDataParam) => {
      if (totalFrames <= 0) return
      const b = frameIndexFromHoverState(state, chartData, 0, totalFrames - 1)
      if (b != null) jumpToFrame(b)
    },
    [chartData, jumpToFrame, totalFrames],
  )

  const handleChartAreaEnter = useCallback(() => {
    wasPlayingBeforeScrubRef.current = isPlaying
    setHoverWindowCenterFrame((cur) =>
      cur != null
        ? cur
        : totalFrames > 0
          ? Math.max(0, Math.min(totalFrames - 1, frameIndex))
          : 0,
    )
    pause()
  }, [frameIndex, isPlaying, pause, totalFrames])

  const handleChartAreaLeave = useCallback(() => {
    setHoverWindowCenterFrame(null)
    if (wasPlayingBeforeScrubRef.current) resume()
  }, [resume])

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate max-w-[min(100%,28rem)]">
          {phase ? phaseLabel(phase) : "No phase data"}
          {bundleStart != null &&
            frameStartEnd.frameStart != null &&
            frameStartEnd.frameEnd != null && (
              <span className="ml-2 tabular-nums opacity-80">
                frames {frameStartEnd.frameStart}–{frameStartEnd.frameEnd} ·
                bundle {bundleStart}–{bundleEnd}
              </span>
            )}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={safePhase <= 0}
            onClick={() => goToPhase(safePhase - 1)}
            aria-label="Previous phase"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-1 min-w-[4.5rem] text-center">
            {n === 0 ? "—" : `${safePhase + 1} / ${n}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={safePhase >= n - 1}
            onClick={() => goToPhase(safePhase + 1)}
            aria-label="Next phase"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex min-h-[10rem] items-center justify-center text-muted-foreground/50 text-sm">
          No series data
        </div>
      ) : (
        <div
          className="h-72 w-full min-h-72 min-w-0 sm:h-80 sm:min-h-80"
          onMouseEnter={handleChartAreaEnter}
          onMouseLeave={handleChartAreaLeave}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              onMouseMove={handleChartMouseMove}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="frame"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                label={{
                  value: "Bundle frame (rolling 150-frame window)",
                  position: "insideBottom",
                  offset: -2,
                  style: { fill: "var(--muted-foreground)", fontSize: 10 },
                }}
              />
              <YAxis
                domain={[0, 1]}
                width={36}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickCount={6}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value) =>
                  typeof value === "number" ? [value.toFixed(3), ""] : ["", ""]
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
              />
              {INDICATOR_STYLES.map(({ id, label, color }) => (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={label}
                  stroke={color}
                  strokeWidth={1.5}
                  fill={color}
                  fillOpacity={AREA_FILL_OPACITY}
                  baseLine={0}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={false}
                />
              ))}
              {boundaryMarkers.map((marker) => (
                marker.kind === 'start' ? (
                  <ReferenceArea
                    key={`area-${marker.key}`}
                    x1={Math.max(windowStart, marker.x - 0.5)}
                    x2={Math.min(windowEnd, marker.x + 0.5)}
                    fill="var(--primary)"
                    fillOpacity={0.18}
                    ifOverflow="extendDomain"
                  />
                ) : null
              ))}
              {boundaryMarkers.map((marker) => (
                <ReferenceLine
                  key={marker.key}
                  x={marker.x}
                  stroke="var(--chart-ref-line-strong, #ffffff)"
                  strokeOpacity={marker.kind === 'start' ? 0.85 : 0.55}
                  strokeWidth={marker.kind === 'start' ? 1.4 : 0.8}
                />
              ))}
              {safeFrameIndex != null && (
                <ReferenceLine
                  x={safeFrameIndex}
                  stroke="var(--primary)"
                  strokeWidth={1.25}
                  strokeDasharray="4 3"
                  strokeOpacity={0.9}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
