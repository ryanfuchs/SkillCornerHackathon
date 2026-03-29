import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Layers,
  Link2,
  Radio,
  Sparkles,
  Triangle,
  Zap,
} from 'lucide-react'
import { IndicatorExplorer } from '@/components/concept/IndicatorExplorer'
import { LiveChaosStrip } from '@/components/concept/LiveChaosStrip'
import { MorphingMeshVisual } from '@/components/concept/MorphingMeshVisual'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const nav = [
  { id: 'core', label: 'Core idea' },
  { id: 'origin', label: 'How we built it' },
  { id: 'indicators', label: 'Indicators' },
  { id: 'technical', label: 'Stack' },
] as const

function SectionShell({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id: string
  eyebrow?: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-28 border-t border-black/[0.06] pt-16 first:border-t-0 first:pt-0 dark:border-white/[0.08]',
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#86868b] dark:text-[#98989d]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-tight tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function ConceptPage() {
  return (
    <SiteLayout marketing>
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-[#fab95b]/20 blur-3xl dark:bg-[#fab95b]/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-32 top-[40%] h-[360px] w-[360px] rounded-full bg-[#547792]/25 blur-3xl dark:bg-[#547792]/15"
          aria-hidden
        />

        <main className="relative mx-auto max-w-[1060px] px-5 pb-28 pt-10 sm:px-6 sm:pt-14">
          {/* Jump nav */}
          <nav
            className="sticky top-[3.25rem] z-30 -mx-1 mb-10 flex flex-wrap justify-center gap-1.5 rounded-full border border-black/[0.06] bg-[#fbfbfd]/75 px-2 py-2 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/40 sm:justify-start"
            aria-label="On this page"
          >
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#424245] transition-colors hover:bg-black/[0.06] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:bg-white/10 dark:hover:text-[#f5f5f7]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Hero */}
          <header className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/60 px-3 py-1 text-[11px] font-semibold text-[#547792] shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.06]">
                <Sparkles className="size-3.5" aria-hidden />
                Chaos-aware analytics
              </div>
              <h1 className="mt-5 text-[clamp(2.25rem,6vw,3.25rem)] font-semibold leading-[1.08] tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                Quantify the moments a match{' '}
                <span className="bg-gradient-to-r from-[#1a3263] to-[#fab95b] bg-clip-text text-transparent dark:from-[#547792] dark:to-[#fab95b]">
                  tips into chaos
                </span>
                .
              </h1>
              <p className="mt-5 max-w-[540px] text-[18px] leading-relaxed text-[#6e6e73] sm:text-[19px] dark:text-[#a1a1a6]">
                Beyond possession and xG: frame-by-frame tracking indicators that
                spike when structure breaks, the ball goes erratic, and lines
                accelerate into each other.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/match"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-11 rounded-full px-7 text-[15px] shadow-md',
                  )}
                >
                  Open match lab
                  <ArrowRight className="ml-2 size-4" aria-hidden />
                </Link>
                <a
                  href="#indicators"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-11 rounded-full border-black/10 bg-white/70 px-7 text-[15px] dark:border-white/15 dark:bg-white/5',
                  )}
                >
                  Explore indicators
                </a>
              </div>
            </div>
            <div className="relative rounded-[1.35rem] border border-black/[0.06] bg-white/50 p-6 shadow-[0_8px_40px_-20px_rgba(0,0,0,0.2)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05]">
              <MorphingMeshVisual className="mx-auto w-full max-w-[340px]" />
              <p className="mt-4 text-center text-[13px] leading-snug text-[#86868b] dark:text-[#98989d]">
                Shape graphs from Delaunay triangulation — tactical lines emerge
                from geometry, not nominal formations.
              </p>
              <div className="mt-6 rounded-2xl border border-black/[0.05] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.04]">
                <LiveChaosStrip />
              </div>
            </div>
          </header>

          <SectionShell
            id="core"
            eyebrow="01 — Philosophy"
            title="The core idea"
          >
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
                <p>
                  Modern analytics overflow with possession, pass completion, and
                  expected goals. Football is still a game of{' '}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    sudden transitions
                  </strong>
                  : counters, errors, and movement that disorder the defending
                  team.
                </p>
                <p>
                  We visualize that disorder with tracking-driven indicators that
                  score how defensive structure collapses, how wildly the ball
                  moves, and how player lines explode — mathematically, at each
                  instant of the match.
                </p>
              </div>
              <ul className="space-y-3 rounded-2xl border border-black/[0.06] bg-white/55 p-5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                {[
                  { icon: Zap, text: 'Counter-attacks & broken rest-defense' },
                  { icon: Activity, text: 'Erratic ball paths vs. calm control' },
                  { icon: Layers, text: 'Shape integrity in real space & time' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-[16px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#1a3263]/10 text-[#1a3263] dark:bg-[#fab95b]/15 dark:text-[#fab95b]">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </SectionShell>

          <SectionShell
            id="origin"
            eyebrow="02 — Method"
            title="How we came up with it"
          >
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
                <p>
                  On video, the biggest threats appear when play snaps from order
                  to transition. Nominal formations mislead: a 4-3-3 on paper
                  rarely matches live geometry.
                </p>
                <p>
                  We use{' '}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Delaunay triangulation
                  </strong>{' '}
                  to build a dynamic shape graph — a mesh between players every
                  frame — and derive tactical layers (defense, midfield, attack)
                  from pure spatial relationships.
                </p>
                <p>
                  That continuity lets us measure when a team&apos;s structure
                  physically breaks, not when a label says it might.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-black/[0.06] bg-gradient-to-br from-white/80 to-[#e8e2db]/40 p-6 dark:border-white/[0.08] dark:from-white/[0.08] dark:to-[#1a3263]/20">
                <div className="flex items-center gap-3 text-[#1a3263] dark:text-[#fab95b]">
                  <Triangle className="size-8 shrink-0" strokeWidth={1.25} aria-hidden />
                  <span className="text-[18px] font-semibold leading-snug text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Triangles → layers → integrity
                  </span>
                </div>
                <MorphingMeshVisual className="mt-5 w-full max-w-[280px]" />
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="indicators"
            eyebrow="03 — Models"
            title="Chaos indicators"
          >
            <p className="max-w-[720px] text-[17px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
              Five complementary scores, each in{' '}
              <span className="whitespace-nowrap font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                [0, 1]
              </span>
              , computed from SkillCorner-style tracking. Together they feed the
              charts and radar you see in the match view.
            </p>
            <div className="mt-10">
              <IndicatorExplorer />
            </div>
          </SectionShell>

          <SectionShell
            id="technical"
            eyebrow="04 — Implementation"
            title="Technical stack"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: Triangle,
                  title: 'Tactical mapping',
                  body: (
                    <>
                      Delaunay triangulation (
                      <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[13px] dark:bg-white/10">
                        position_analysis.py
                      </code>
                      ) groups players into moving tactical lines — independent of
                      nominal formation.
                    </>
                  ),
                },
                {
                  icon: Radio,
                  title: 'Frontend',
                  body: 'React + Vite dashboard; tracking JSONL streamed via ?url imports and useMatchTracking so ~100MB files never block the main thread.',
                },
                {
                  icon: Link2,
                  title: 'Synchronized UI',
                  body: 'PitchView (2D pitch, 10 Hz), timeline, phase chart, and radar share global playback context — scrub once, everything follows.',
                },
                {
                  icon: Layers,
                  title: 'Deep dives',
                  body: (
                    <>
                      <Link
                        to="/methodology/timeline"
                        className="font-medium text-[#0066cc] underline-offset-2 hover:underline dark:text-[#2997ff]"
                      >
                        Timeline &amp; sync
                      </Link>
                      {' · '}
                      <Link
                        to="/methodology/indicators"
                        className="font-medium text-[#0066cc] underline-offset-2 hover:underline dark:text-[#2997ff]"
                      >
                        Indicator reference
                      </Link>
                    </>
                  ),
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.05] sm:p-6"
                >
                  <card.icon
                    className="size-6 text-[#547792] dark:text-[#fab95b]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <h3 className="mt-3 text-[18px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {card.title}
                  </h3>
                  <div className="mt-2 text-[15px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                    {card.body}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-[1.35rem] border border-black/[0.06] bg-gradient-to-r from-[#1a3263] to-[#547792] p-[1px] dark:border-white/[0.12]">
              <div className="rounded-[1.3rem] bg-[#fbfbfd] px-6 py-8 text-center dark:bg-[#1c1c1e]">
                <p className="text-[17px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  See the chaos score move with the ball.
                </p>
                <Link
                  to="/match"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'mt-5 inline-flex h-11 rounded-full px-8 text-[15px]',
                  )}
                >
                  Launch match view
                </Link>
              </div>
            </div>
          </SectionShell>
        </main>
      </div>
    </SiteLayout>
  )
}
