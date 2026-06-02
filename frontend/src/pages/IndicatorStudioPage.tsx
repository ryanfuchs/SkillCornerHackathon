import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { IndicatorMetricVariant } from '@/components/concept/IndicatorMetricMiniPitch'
import { IndicatorMetricMiniPitch } from '@/components/concept/IndicatorMetricMiniPitch'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Indicator Studio — a *mock* of the AI-agent authoring flow.
 *
 * The user describes an indicator idea in plain English; an "agent" streams
 * back a working indicator function plus a live preview on the pitch. There is
 * no real model call — prompts are matched against a small set of canned
 * scenarios (with a generic fallback) and the code is revealed character by
 * character to sell the "generating in seconds" pitch.
 */

type Scenario = {
  /** Lowercase keywords that route a prompt to this scenario. */
  match: string[]
  fnName: string
  title: string
  blurb: string
  variant: IndicatorMetricVariant
  tags: string[]
  code: string
}

const SCENARIOS: Scenario[] = [
  {
    match: ['overload', 'flank', 'wing', 'wide', 'left', 'right', 'fullback'],
    fnName: 'flank_overload',
    title: 'Flank overload',
    blurb:
      'Flags moments where the attacking side packs more bodies into one wide channel than the defence can cover.',
    variant: 'player_clusters',
    tags: ['overload', 'wide play', 'community'],
    code: `import numpy as np
from matchlab import Frame, clamp01, register

@register("flank_overload", normalize="rolling")
def flank_overload(frame: Frame) -> float:
    """Numerical overload in the widest attacking channel.

    Splits the pitch into left / middle / right thirds and contrasts
    attacker vs. defender counts in whichever flank the ball sits in.
    """
    side = "left" if frame.ball.x_norm < 0.5 else "right"
    lo, hi = (0.0, 0.33) if side == "left" else (0.67, 1.0)

    attackers = [p for p in frame.attacking_team if lo <= p.x_norm <= hi]
    defenders = [p for p in frame.defending_team if lo <= p.x_norm <= hi]

    if not attackers:
        return 0.0

    advantage = len(attackers) - len(defenders)
    depth = np.mean([p.y_norm for p in attackers])  # how high the unit sits
    return clamp01(0.18 * advantage + 0.4 * depth)`,
  },
  {
    match: ['press', 'pressing', 'gegen', 'counterpress', 'trigger', 'win back'],
    fnName: 'press_trigger',
    title: 'Press trigger intensity',
    blurb:
      'Scores how aggressively the team out of possession collapses on the ball carrier in the first 1.5 seconds after a turnover.',
    variant: 'ball_chaos',
    tags: ['pressing', 'transitions', 'community'],
    code: `import numpy as np
from matchlab import Frame, clamp01, register

@register("press_trigger", window_s=1.5)
def press_trigger(frame: Frame) -> float:
    """Closing speed of the nearest defenders onto the carrier."""
    carrier = frame.ball_carrier
    if carrier is None:
        return 0.0

    chasers = sorted(
        frame.defending_team,
        key=lambda p: p.distance_to(carrier),
    )[:3]

    # Component 1: how close the press already is.
    proximity = np.mean([1.0 - p.distance_to(carrier) / 20.0 for p in chasers])
    # Component 2: are they actively accelerating toward the ball?
    closing = np.mean([max(0.0, p.accel_toward(carrier)) for p in chasers])

    return clamp01(0.55 * proximity + 0.45 * closing)`,
  },
  {
    match: ['line break', 'through', 'split', 'between the lines', 'pocket', 'progress'],
    fnName: 'line_break_threat',
    title: 'Line-break threat',
    blurb:
      'Highlights frames where a receiver is open between the opposition midfield and defensive lines with a passing lane available.',
    variant: 'line_to_line_acceleration',
    tags: ['progression', 'between the lines', 'community'],
    code: `import numpy as np
from matchlab import Frame, clamp01, register

@register("line_break_threat")
def line_break_threat(frame: Frame) -> float:
    """Open receiver between the midfield and defensive lines."""
    mid_line = frame.defending_team.line("midfield").y_norm
    back_line = frame.defending_team.line("defence").y_norm

    pocket = [
        p for p in frame.attacking_team
        if mid_line < p.y_norm < back_line
    ]
    if not pocket:
        return 0.0

    # Most advanced receiver in the pocket with the cleanest lane.
    best = max(pocket, key=lambda p: p.y_norm)
    lane = 1.0 - frame.lane_congestion(frame.ball, best)
    space = best.nearest_defender_distance() / 12.0

    return clamp01(0.5 * lane + 0.5 * min(space, 1.0))`,
  },
]

const GENERIC: Omit<Scenario, 'match'> = {
  fnName: 'custom_indicator',
  title: 'Custom indicator',
  blurb:
    'A first-pass indicator scaffolded from your description. Tweak the weights, then run it live in MatchLab.',
  variant: 'position_change',
  tags: ['custom', 'draft'],
  code: `import numpy as np
from matchlab import Frame, clamp01, register

@register("custom_indicator", normalize="rolling")
def custom_indicator(frame: Frame) -> float:
    """Generated from your description.

    Starting point: spatial spread of the attacking unit between frames.
    Adjust the components below to match the behaviour you had in mind.
    """
    movers = frame.attacking_team.moved_since(frame.prev)
    if not movers:
        return 0.0

    churn = np.mean([p.grid_distance(frame.prev) for p in movers])
    spread = frame.attacking_team.convex_hull_area() / 1500.0

    return clamp01(0.6 * churn + 0.4 * spread)`,
}

const EXAMPLE_PROMPTS = [
  'When does my team create a 3v2 overload on the left wing?',
  'Show me how hard we counter-press in the first 1.5s after losing the ball',
  'Find passes that break the line into the pocket between midfield and defence',
]

function pickScenario(prompt: string): Omit<Scenario, 'match'> {
  const p = prompt.toLowerCase()
  let best: Scenario | null = null
  let bestScore = 0
  for (const s of SCENARIOS) {
    const score = s.match.reduce((n, kw) => (p.includes(kw) ? n + 1 : n), 0)
    if (score > bestScore) {
      best = s
      bestScore = score
    }
  }
  return best ?? GENERIC
}

type Phase = 'idle' | 'thinking' | 'streaming' | 'done'

const THINKING_STEPS = [
  'Parsing your description…',
  'Mapping concept to tracking-data primitives…',
  'Selecting frame-level features…',
  'Writing the indicator function…',
]

export function IndicatorStudioPage() {
  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [thinkingStep, setThinkingStep] = useState(0)
  const [result, setResult] = useState<Omit<Scenario, 'match'> | null>(null)
  const [shownChars, setShownChars] = useState(0)
  const timers = useRef<number[]>([])
  const codeRef = useRef<HTMLPreElement | null>(null)

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current.forEach((id) => window.clearInterval(id))
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const generate = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || phase === 'thinking' || phase === 'streaming') return
      clearTimers()
      const scenario = pickScenario(text)
      setResult(scenario)
      setShownChars(0)
      setPhase('thinking')
      setThinkingStep(0)

      // Cycle through the fake reasoning steps.
      THINKING_STEPS.forEach((_, i) => {
        timers.current.push(
          window.setTimeout(() => setThinkingStep(i), i * 520),
        )
      })

      // After "thinking", stream the code out.
      timers.current.push(
        window.setTimeout(() => {
          setPhase('streaming')
          const total = scenario.code.length
          const interval = window.setInterval(() => {
            setShownChars((c) => {
              const next = c + Math.max(2, Math.round(total / 90))
              if (next >= total) {
                window.clearInterval(interval)
                setPhase('done')
                return total
              }
              return next
            })
          }, 18)
          timers.current.push(interval)
        }, THINKING_STEPS.length * 520 + 220),
      )
    },
    [phase, clearTimers],
  )

  useEffect(() => {
    if (phase === 'streaming' && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [shownChars, phase])

  const reset = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setResult(null)
    setShownChars(0)
  }, [clearTimers])

  const shownCode = useMemo(() => {
    if (!result) return ''
    return phase === 'done' ? result.code : result.code.slice(0, shownChars)
  }, [result, phase, shownChars])

  const busy = phase === 'thinking' || phase === 'streaming'

  return (
    <SiteLayout marketing>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-12 sm:pt-16">
        <p className="text-[15px] font-medium text-[#86868b] dark:text-[#98989d]">
          <Link
            to="/indicator-hub"
            className="text-[#0066cc] hover:underline dark:text-[#2997ff]"
          >
            ← Indicator Hub
          </Link>
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-violet-500/12 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
            AI agent · concept
          </span>
          <h1 className="text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[46px] dark:text-[#f5f5f7]">
            Indicator Studio
          </h1>
          <p className="max-w-[680px] text-[19px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
            Imagine having an idea for a new indicator but not being sure how to
            build it — you describe the concept in plain English and an agent
            writes the indicator function for you, ready to run in MatchLab in
            seconds. No boilerplate, no setup, no dependency hell. This page is a
            visual mock-up of that experience.
          </p>
          <div className="max-w-[680px] rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-[14px] leading-relaxed text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/[0.07] dark:text-amber-200">
            <strong className="font-semibold">Heads up:</strong> this is a
            concept, not a working product. There&apos;s no real AI behind it —
            the &ldquo;generated&rdquo; code and responses below are scripted to
            illustrate the idea. Nothing you type is sent anywhere or actually
            executed.
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          {/* Prompt column */}
          <div className="flex flex-col gap-5">
            <div className="rounded-[1.35rem] border border-black/[0.06] bg-white/75 p-6 shadow-[0_4px_28px_-14px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.06]">
              <label
                htmlFor="studio-prompt"
                className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#86868b] dark:text-[#98989d]"
              >
                Describe your indicator
              </label>
              <textarea
                id="studio-prompt"
                value={prompt}
                onChange={(ev) => setPrompt(ev.target.value)}
                onKeyDown={(ev) => {
                  if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
                    ev.preventDefault()
                    generate(prompt)
                  }
                }}
                rows={5}
                placeholder="e.g. Flag every time we create a numerical overload on the left wing while the ball is in the final third…"
                className="mt-3 w-full resize-none rounded-2xl border border-black/[0.08] bg-white/80 px-4 py-3 text-[15px] leading-relaxed text-[#1d1d1f] shadow-sm outline-none placeholder:text-[#86868b] focus:border-[#0066cc]/40 focus:ring-2 focus:ring-[#0066cc]/20 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-[#f5f5f7] dark:placeholder:text-[#86868b] dark:focus:border-[#2997ff]/50 dark:focus:ring-[#2997ff]/20"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  className="h-11 rounded-full px-6 text-[15px]"
                  disabled={busy || prompt.trim().length === 0}
                  onClick={() => generate(prompt)}
                >
                  {busy ? 'Generating…' : 'Generate indicator'}
                </Button>
                {phase !== 'idle' ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="ghost"
                    className="h-11 rounded-full px-5 text-[15px]"
                    onClick={reset}
                  >
                    Clear
                  </Button>
                ) : null}
                <span className="text-[12px] text-[#86868b] dark:text-[#98989d]">
                  ⌘↵ to generate
                </span>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#86868b] dark:text-[#98989d]">
                Try an example
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPrompt(ex)
                      generate(ex)
                    }}
                    className="rounded-2xl border border-black/[0.06] bg-white/60 px-4 py-3 text-left text-[14px] leading-snug text-[#424245] transition-colors hover:border-[#0066cc]/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#d2d2d7] dark:hover:border-[#2997ff]/35 dark:hover:bg-white/[0.07]"
                  >
                    “{ex}”
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output column */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/75 shadow-[0_4px_28px_-14px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.06]">
              {phase === 'idle' || !result ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-600 dark:text-violet-300">
                    <SparkIcon />
                  </div>
                  <p className="text-[16px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Your generated indicator appears here
                  </p>
                  <p className="max-w-[320px] text-[14px] text-[#86868b] dark:text-[#98989d]">
                    Describe a concept on the left, or pick an example, and the
                    agent will scaffold a runnable function with a live pitch
                    preview.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Agent status bar */}
                  <div className="flex items-center gap-3 border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl text-white',
                        busy
                          ? 'animate-pulse bg-violet-500'
                          : 'bg-emerald-500',
                      )}
                    >
                      {busy ? <SparkIcon small /> : <CheckIcon />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {phase === 'thinking'
                          ? THINKING_STEPS[thinkingStep]
                          : phase === 'streaming'
                            ? `Writing ${result.fnName}()…`
                            : `Generated ${result.fnName}()`}
                      </p>
                      <p className="truncate text-[12px] text-[#86868b] dark:text-[#98989d]">
                        {phase === 'done'
                          ? 'Validated against 12 sample frames · 0 errors'
                          : 'matchlab-agent · gpt-pitch-1'}
                      </p>
                    </div>
                  </div>

                  {/* Generated code */}
                  <div className="relative">
                    <pre
                      ref={codeRef}
                      className="max-h-[360px] overflow-auto bg-[#1d1d1f] px-5 py-4 text-[12.5px] leading-relaxed text-[#e6e6eb] dark:bg-black/40"
                    >
                      <code className="font-mono whitespace-pre">
                        {shownCode}
                        {busy ? (
                          <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-violet-400" />
                        ) : null}
                      </code>
                    </pre>
                  </div>

                  {phase === 'done' ? (
                    <div className="flex flex-col gap-5 px-6 py-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[20px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {result.title}
                        </h2>
                        <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                          AI-generated
                        </span>
                      </div>
                      <p className="text-[15px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                        {result.blurb}
                      </p>

                      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.02] dark:border-white/[0.08] dark:bg-black/20">
                        <IndicatorMetricMiniPitch
                          key={result.fnName}
                          variant={result.variant}
                          className="w-full"
                        />
                        <p className="border-t border-black/[0.06] px-4 py-2 text-center text-[12px] text-[#86868b] dark:border-white/[0.08] dark:text-[#98989d]">
                          Live preview · {result.fnName}() over sample match
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {result.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[12px] text-[#6e6e73] dark:bg-white/[0.08] dark:text-[#a1a1a6]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        <Link
                          to="/matchlab"
                          className={cn(
                            buttonVariants({ size: 'lg' }),
                            'h-11 rounded-full px-6 text-[15px]',
                          )}
                        >
                          Run in MatchLab
                        </Link>
                        <Link
                          to="/indicator-hub"
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'lg' }),
                            'h-11 rounded-full px-6 text-[15px] dark:border-white/15',
                          )}
                        >
                          Publish to Hub
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </SiteLayout>
  )
}

function SparkIcon({ small }: { small?: boolean }) {
  const s = small ? 16 : 22
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
