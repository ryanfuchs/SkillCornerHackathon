import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
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
import { cn } from '@/lib/utils'
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
  /** Per sample (stride-aligned): SkillCorner player ids in the best cluster for that frame. */
  player_clusters_best_player_ids?: number[][]
}

type FrameSeries = {
  trackingFrameIds: number[]
  player_clusters: number[]
  position_change: number[]
  ball_chaos: number[]
  defensive_line: number[]
  line_to_line_acceleration: number[]
  /** Per bundle index: SkillCorner player ids in the best cluster for that frame. */
  player_clusters_best_player_ids: number[][]
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
  /** Omitted in older exports; padded to match `player_clusters` length when missing. */
  player_clusters_best_player_ids?: number[][]
  phasesFile?: string
}

const phasesPart = phaseBreakdownPhases as PhasesPayload
const framesPart = phaseBreakdownFrames as FramesPayload

function padBestClusterIds(fs: FramesPayload): number[][] {
  const raw = fs.player_clusters_best_player_ids
  const n = fs.player_clusters.length
  if (raw != null && raw.length === n) return raw
  if (raw != null && raw.length > 0) return raw
  return Array.from({ length: n }, () => [])
}

const frameSeries: FrameSeries = {
  trackingFrameIds: framesPart.trackingFrameIds,
  player_clusters: framesPart.player_clusters,
  position_change: framesPart.position_change,
  ball_chaos: framesPart.ball_chaos,
  defensive_line: framesPart.defensive_line,
  line_to_line_acceleration: framesPart.line_to_line_acceleration,
  player_clusters_best_player_ids: padBestClusterIds(framesPart),
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
  { id: 'line_to_line_acceleration', label: 'Line to line accel.', color: '#e11d48' },
]

function PhaseIndicatorLegendStrip({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        'm-0 flex list-none flex-wrap gap-2 p-0',
        className,
      )}
      aria-label="Indicators on a zero to one scale"
    >
      {INDICATOR_STYLES.map(({ id, label, color }) => (
        <li
          key={id}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-3 py-1.5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.08)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.07]"
        >
          <span
            className="size-2 shrink-0 rounded-full ring-1 ring-black/[0.08] dark:ring-white/15"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span className="text-[13px] font-medium leading-none tracking-[-0.015em] text-[#1d1d1f] dark:text-[#f5f5f7]">
            {label}
          </span>
        </li>
      ))}
    </ul>
  )
}

const MOVING_WINDOW_FRAMES = 150

function isPhaseRecord(p: PhaseRecord | LegacyPhaseMeta): p is PhaseRecord {
  return p.phaseOfPlay != null && Object.keys(p.phaseOfPlay).length > 0
}

/** Title-case phase type strings from CSV (e.g. "create" → "Create", "build_up" → "Build Up"). */
function formatPhaseTypeLabel(raw: string): string {
  const s = raw.trim()
  if (!s) return 'Unknown'
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Clock + phase type for the header; legacy exports may omit match-clock end. */
function phaseHeaderMeta(p: PhaseRecord | LegacyPhaseMeta) {
  if (isPhaseRecord(p)) {
    const row = p.phaseOfPlay
    const start =
      String(row.time_start ?? '').trim() ||
      (() => {
        const minute = row.minute_start as number
        const second = row.second_start as number
        if (minute == null || second == null) return ''
        return `${minute}:${String(second).padStart(2, '0')}`
      })()
    const end = String(row.time_end ?? '').trim()
    const typ = String(row.team_in_possession_phase_type ?? '').trim() || 'Unknown'
    return { start, end, phaseType: typ }
  }
  const l = p as LegacyPhaseMeta
  const typ = String(l.phaseType ?? '').trim() || 'Unknown'
  const minute = l.minuteStart
  const second = l.secondStart
  const start =
    minute != null && second != null
      ? `${minute}:${String(second).padStart(2, '0')}`
      : ''
  return {
    start,
    end: '',
    phaseType: typ,
  }
}

function frameSeriesLength(fs: FrameSeries): number {
  return Math.min(
    fs.trackingFrameIds.length,
    fs.player_clusters.length,
    fs.position_change.length,
    fs.ball_chaos.length,
    fs.defensive_line.length,
    fs.line_to_line_acceleration.length,
    fs.player_clusters_best_player_ids.length,
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
    player_clusters_best_player_ids: number[]
  }> = []
  for (let i = windowStart; i <= hi; i += stride) {
    rows.push({
      frame: i,
      player_clusters: fs.player_clusters[i] ?? 0,
      position_change: fs.position_change[i] ?? 0,
      ball_chaos: fs.ball_chaos[i] ?? 0,
      defensive_line: fs.defensive_line[i] ?? 0,
      line_to_line_acceleration: fs.line_to_line_acceleration[i] ?? 0,
      player_clusters_best_player_ids:
        fs.player_clusters_best_player_ids[i] ?? [],
    })
  }
  return rows
}

type ChartRow = ReturnType<typeof chartRowsFromFrameWindow>[number]

/** Shared with <YAxis width={…} /> and ComposedChart margin — pointer→frame mapping must match plot bounds. */
const PHASE_CHART_Y_AXIS_WIDTH = 36
const PHASE_CHART_MARGIN_RIGHT = 8

const PHASE_CHART_PLOT = {
  marginLeft: 0,
  marginRight: PHASE_CHART_MARGIN_RIGHT,
  yAxisWidth: PHASE_CHART_Y_AXIS_WIDTH,
} as const

/**
 * Linear map across the plot width (Recharts’ discrete activeTooltipIndex only snaps to strided points,
 * which feels like “left vs right of center” instead of following drag).
 * Pointer position uses the same SVG scaling idea as Recharts getRelativeCoordinate.
 */
function bundleFrameFromPlotPointerX(
  event: ReactMouseEvent<SVGGraphicsElement>,
  domainMin: number,
  domainMax: number,
): number {
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const svg = target as SVGSVGElement
  const bbox = typeof svg.getBBox === 'function' ? svg.getBBox() : { width: rect.width, height: rect.height }
  const scaleX = bbox.width > 0 ? rect.width / bbox.width : 1
  const relativeX = (event.clientX - rect.left) / scaleX
  const chartWidth = bbox.width
  const plotLeft = PHASE_CHART_PLOT.marginLeft + PHASE_CHART_PLOT.yAxisWidth
  const plotWidth = chartWidth - plotLeft - PHASE_CHART_PLOT.marginRight
  if (plotWidth <= 0 || !Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
    return Math.round(domainMin)
  }
  if (domainMax === domainMin) return Math.round(domainMin)
  const t = (relativeX - plotLeft) / plotWidth
  const clampedT = Math.max(0, Math.min(1, t))
  return Math.round(domainMin + clampedT * (domainMax - domainMin))
}

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
    playbackFrameCount,
    setPhaseIndex,
    jumpToFrame,
    pause,
    resume,
    isPlaying,
  } = usePlayback()
  const wasPlayingBeforeScrubRef = useRef(true)
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
  const phaseHeader = phase ? phaseHeaderMeta(phase) : null
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

  /** Match pitch/timeline: same index as playback (no throttle — throttle caused line/window lag). */
  const syncFrameIndex =
    totalFrames > 0 && playbackFrameCount > 0
      ? Math.min(frameIndex, totalFrames - 1, playbackFrameCount - 1)
      : totalFrames > 0
        ? Math.min(frameIndex, totalFrames - 1)
        : 0

  /** Always track playback — a frozen “hover center” caused the window/line to drift after scrub. */
  const activeWindowCenterFrame =
    totalFrames > 0 ? Math.max(0, Math.min(totalFrames - 1, syncFrameIndex)) : 0

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
    totalFrames > 0 ? Math.max(0, Math.min(totalFrames - 1, syncFrameIndex)) : null

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

  const hoverRafRef = useRef(0)
  /** Touch/pen drag: Recharts often reports buttons=0 on move; track active pointer scrub. */
  const touchScrubRef = useRef(false)

  const scrubToChartState = useCallback(
    (state: MouseHandlerDataParam, event?: ReactMouseEvent<SVGGraphicsElement>) => {
      if (totalFrames <= 0 || chartData.length === 0) return
      cancelAnimationFrame(hoverRafRef.current)
      hoverRafRef.current = requestAnimationFrame(() => {
        const domainMin = chartData[0]!.frame
        const domainMax = chartData[chartData.length - 1]!.frame
        const b = event
          ? bundleFrameFromPlotPointerX(event, domainMin, domainMax)
          : frameIndexFromHoverState(state, chartData, 0, totalFrames - 1)
        if (b == null) return
        jumpToFrame(Math.max(0, Math.min(totalFrames - 1, b)))
      })
    },
    [chartData, jumpToFrame, totalFrames],
  )

  /** Only scrub while primary button is held (drag), not on passive hover. */
  const handleChartMouseMove = useCallback(
    (
      state: MouseHandlerDataParam,
      event?: ReactMouseEvent<SVGGraphicsElement>,
    ) => {
      const buttons = event?.nativeEvent?.buttons ?? 0
      const leftHeld = (buttons & 1) !== 0
      if (!leftHeld && !touchScrubRef.current) return
      scrubToChartState(state, event)
    },
    [scrubToChartState],
  )

  const handleChartClick = useCallback(
    (state: MouseHandlerDataParam, event?: ReactMouseEvent<SVGGraphicsElement>) => {
      scrubToChartState(state, event)
    },
    [scrubToChartState],
  )

  const handleChartAreaEnter = useCallback(() => {
    wasPlayingBeforeScrubRef.current = isPlaying
    pause()
  }, [isPlaying, pause])

  const handleChartAreaLeave = useCallback(() => {
    if (wasPlayingBeforeScrubRef.current) resume()
  }, [resume])

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        {phase && phaseHeader ? (
          <div className="min-w-0 flex max-w-[min(100%,32rem)] flex-col gap-2">
            <div className="flex flex-col gap-1 text-sm leading-snug text-foreground">
              <p className="text-sm">
                <span className="text-muted-foreground">Phase type: </span>
                <span className="font-medium text-foreground">
                  {formatPhaseTypeLabel(phaseHeader.phaseType)}
                </span>
              </p>
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="tabular-nums">
                  <span className="font-medium text-foreground">Start </span>
                  <span className="text-foreground">
                    {phaseHeader.start || '—'}
                  </span>
                  <span className="mx-1.5 text-muted-foreground" aria-hidden>
                    ,
                  </span>
                  <span className="font-medium text-foreground">End </span>
                  <span className="text-foreground">
                    {phaseHeader.end || '—'}
                  </span>
                </span>
              </p>
              {bundleStart != null &&
                frameStartEnd.frameStart != null &&
                frameStartEnd.frameEnd != null && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Tracking frames {frameStartEnd.frameStart} through{' '}
                    {frameStartEnd.frameEnd}. Bundle indices {bundleStart} through{' '}
                    {bundleEnd}.
                  </p>
                )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No phase data</p>
        )}
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
        <>
        <PhaseIndicatorLegendStrip className="mb-3" />
        <div
          className="h-72 w-full min-h-72 min-w-0 sm:h-80 sm:min-h-80"
          onMouseEnter={handleChartAreaEnter}
          onMouseLeave={handleChartAreaLeave}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
              touchScrubRef.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
              touchScrubRef.current = false
              try {
                e.currentTarget.releasePointerCapture(e.pointerId)
              } catch {
                /* not captured */
              }
            }
          }}
          onPointerCancel={(e) => {
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
              touchScrubRef.current = false
            }
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{
                top: 4,
                right: PHASE_CHART_MARGIN_RIGHT,
                left: 0,
                bottom: 0,
              }}
              onMouseMove={handleChartMouseMove}
              onClick={handleChartClick}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="frame"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                domain={[0, 1]}
                width={PHASE_CHART_Y_AXIS_WIDTH}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickCount={6}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  fontSize: 13,
                  padding: "10px 14px",
                  boxShadow:
                    "0 8px 32px -12px rgba(0,0,0,0.18), 0 2px 8px -4px rgba(0,0,0,0.08)",
                }}
                formatter={(value) =>
                  typeof value === "number" ? [value.toFixed(3), ""] : ["", ""]
                }
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
        </>
      )}
    </div>
  );
}
