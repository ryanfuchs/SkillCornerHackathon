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
          {/* Hero */}
          <header className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/60 px-3 py-1 text-[11px] font-semibold text-[#547792] shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.06]">
                <Sparkles className="size-3.5" aria-hidden />
                Chaos aware analytics
              </div>
              <h1 className="mt-5 text-[clamp(2.25rem,6vw,3.25rem)] font-semibold leading-[1.08] tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                Quantify the moments a match{' '}
                <span className="bg-gradient-to-r from-[#1a3263] to-[#fab95b] bg-clip-text text-transparent dark:from-[#547792] dark:to-[#fab95b]">
                  tips into chaos
                </span>
                .
              </h1>
              <p className="mt-5 max-w-[540px] text-[18px] leading-relaxed text-[#6e6e73] sm:text-[19px] dark:text-[#a1a1a6]">
                Alongside possession and expected goals we track the match frame
                by frame. Indicators spike when structure breaks, the ball turns
                erratic, and opposing lines accelerate into one another.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/match-lab"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-11 rounded-full px-7 text-[15px] shadow-md',
                  )}
                >
                  Open MatchLab
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
                Delaunay triangulation builds the shape graph so tactical lines
                come from measured geometry instead of a nominal formation label.
              </p>
              <div className="mt-6 rounded-2xl border border-black/[0.05] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.04]">
                <LiveChaosStrip />
              </div>
            </div>
          </header>

          <SectionShell
            id="core"
            eyebrow="01 Philosophy"
            title="The core idea"
          >
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
                <p>
                  Modern dashboards already stress possession, pass completion,
                  and expected goals. The sport still turns on{' '}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    sudden transitions
                  </strong>
                  . Counters, mistakes, and coordinated movement can disorder a
                  defense in seconds.
                </p>
                <p>
                  We visualize that disorder with tracking driven indicators that
                  score how defensive structure collapses, how wildly the ball
                  moves, and how player lines separate, at every instant of the
                  match and with explicit geometry behind each value.
                </p>
              </div>
              <ul className="space-y-3 rounded-2xl border border-black/[0.06] bg-white/55 p-5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                {[
                  { icon: Zap, text: 'Counter attacks and broken rest defense' },
                  { icon: Activity, text: 'Erratic ball paths versus calm control' },
                  { icon: Layers, text: 'Shape integrity in real space and time' },
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

          <figure
            id="footage"
            className="scroll-mt-28 mx-auto my-12 w-full max-w-xl overflow-hidden rounded-xl border border-black/[0.06] bg-[#0a0a0b] shadow-[0_10px_40px_-20px_rgba(0,0,0,0.22)] dark:border-white/[0.08] dark:shadow-[0_12px_36px_-18px_rgba(0,0,0,0.55)] sm:my-16 sm:max-w-2xl"
          >
            <div className="relative aspect-video w-full">
              <video
                className="absolute inset-0 h-full w-full object-contain"
                src="/Team-Video.mp4"
                controls
                playsInline
                preload="metadata"
              >
                Your browser does not support embedded video.
              </video>
            </div>
            <figcaption className="border-t border-white/[0.08] bg-[#141416] px-3 py-2.5 text-center sm:px-4">
              <span className="text-[12px] font-semibold tracking-tight text-[#f5f5f7]">
                This is our idea and the team behind it
              </span>
            </figcaption>
          </figure>

          <SectionShell
            id="origin"
            eyebrow="02 Method"
            title="How we came up with it"
          >
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
                <p>
                  On video you see it clearly. The dangerous moments are when
                  play flips from settled shape into a transition. What is
                  printed on the teamsheet is rarely where players actually
                  stand.
                </p>
                <p>
                  We use{' '}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Delaunay triangulation
                  </strong>{' '}
                  to link players into a mesh each frame, then read defense,
                  midfield, and attack off that geometry instead of a formation
                  name.
                </p>
                <p>
                  So we track when the shape actually comes apart, not when a
                  tag on a broadcast says it might.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-black/[0.06] bg-gradient-to-br from-white/80 to-[#e8e2db]/40 p-6 dark:border-white/[0.08] dark:from-white/[0.08] dark:to-[#1a3263]/20">
                <div className="flex items-center gap-3 text-[#1a3263] dark:text-[#fab95b]">
                  <Triangle className="size-8 shrink-0" strokeWidth={1.25} aria-hidden />
                  <span className="text-[18px] font-semibold leading-snug text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Triangles, layers, integrity
                  </span>
                </div>
                <MorphingMeshVisual className="mt-5 w-full max-w-[280px]" />
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="indicators"
            eyebrow="03 Models"
            title="Analytics indicators"
          >
            <p className="max-w-[720px] text-[17px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
              Five complementary scores, each normalized from zero to one, come
              straight from SkillCorner style tracking. Together they power the
              charts and radar inside MatchLab.
            </p>
            <div className="mt-10">
              <IndicatorExplorer />
            </div>
          </SectionShell>

          <SectionShell
            id="technical"
            eyebrow="04 Implementation"
            title="Technical stack"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: Triangle,
                  title: 'Tactical mapping',
                  body: (
                    <>
                      Delaunay triangulation in{' '}
                      <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[13px] dark:bg-white/10">
                        position_analysis.py
                      </code>{' '}
                      groups players into moving tactical lines that do not depend
                      on a nominal formation label.
                    </>
                  ),
                },
                {
                  icon: Radio,
                  title: 'Frontend',
                  body: 'The interface pairs React with Vite. Tracking arrives as JSONL through url imports and useMatchTracking so very large files never freeze the main thread.',
                },
                {
                  icon: Link2,
                  title: 'Synchronized UI',
                  body: 'PitchView renders the two dimensional pitch at ten hertz next to the timeline, phase chart, and radar. One shared playback clock means a single scrub keeps every surface aligned.',
                },
                {
                  icon: Layers,
                  title: 'Deep dives',
                  body: (
                    <>
                      <Link
                        to="/methodology/data-pipeline"
                        className="font-medium text-[#0066cc] underline-offset-2 hover:underline dark:text-[#2997ff]"
                      >
                        Data pipeline
                      </Link>
                      {' and '}
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
                  See Ball Acceleration and the other metrics move with the ball.
                </p>
                <Link
                  to="/match-lab"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'mt-5 inline-flex h-11 rounded-full px-8 text-[15px]',
                  )}
                >
                  Launch MatchLab
                </Link>
              </div>
            </div>
          </SectionShell>
        </main>
      </div>
    </SiteLayout>
  )
}
