import type { ReactNode } from 'react'
import { SiteLayout } from '@/components/layout/SiteLayout'

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-14 border-t border-black/[0.06] pt-12 first:mt-0 first:border-t-0 first:pt-0 dark:border-white/[0.08]">
      <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
        {children}
      </div>
    </section>
  )
}

export function IndicatorsExplainedPage() {
  return (
    <SiteLayout marketing>
      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[44px] dark:text-[#f5f5f7]">
          Indicator calculations
        </h1>
        <p className="mt-5 text-[19px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
          These definitions match the Python analyzers under{' '}
          <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
            analysis/
          </code>
          . Each analyzer produces a per-frame score in{' '}
          <span className="whitespace-nowrap">[0, 1]</span>, exported into the
          JSON the phase chart reads.
        </p>

        <Section title="Player clusters">
          <p>
            For every frame, pairwise distances between detected outfield players
            are turned into proximity scores{' '}
            <span className="whitespace-nowrap font-mono text-[15px]">
              1 / (1 + d/σ)
            </span>{' '}
            with σ = 1&nbsp;m, ignoring pairs farther than 10&nbsp;m. The frame
            score is the median of those pairwise scores, then smoothed with a
            running average over recent frames so the trace is less noisy.
          </p>
          <p>
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{' '}
            values mean players are generally closer together (more compact
            clustering).
          </p>
        </Section>

        <Section title="Position change">
          <p>
            Players are mapped to a discrete tactical grid (inferred positions)
            for the current and previous frame. For everyone visible in both
            frames, we sum the Euclidean distance between grid coordinates
            (equivalent to total “steps” on the grid).
          </p>
          <p>
            That raw sum is normalized by a fixed upper bound and exposed as a{' '}
            <span className="whitespace-nowrap">0–1</span> score.{' '}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{' '}
            means more collective positional churn frame-to-frame.
          </p>
        </Section>

        <Section title="Ball chaos">
          <p>
            A composite of four components when the ball is detected: height
            (capped at 3&nbsp;m), proximity to the nearest goal (closer → higher
            intensity), speed from frame-to-frame (10&nbsp;Hz → m/s, scaled to a
            cap around 80&nbsp;km/h), and alignment of ball motion toward goal
            (cosine-style direction term).
          </p>
          <p>
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{' '}
            values flag moments that are fast, elevated, goal-near, or directed
            dangerously—useful for highlighting chaotic attacking actions.
          </p>
        </Section>

        <Section title="Defensive line">
          <p>
            Given possession, the defending team’s outfield players are placed
            on a tactical shape graph. The metric inspects the “line” structure
            (tactical x-bands) of those defenders and scores qualities like line
            jaggedness and spacing consistency.
          </p>
          <p>
            If possession or shape inference is missing, the score is zero.{' '}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{' '}
            values correspond to a more organized defensive line under the model’s
            geometric rules.
          </p>
        </Section>

        <Section title="Line-to-line acceleration">
          <p>
            For the team in possession, players on the most advanced tactical
            line are compared to opponents on the deepest line. We estimate
            accelerations from positional change at 0.1&nbsp;s steps, compare
            mean forward acceleration of the offensive line versus the defensive
            line, and map the difference into{' '}
            <span className="whitespace-nowrap">[0, 1]</span> with a fixed bias
            and scale.
          </p>
          <p>
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{' '}
            values mean the attacking line is accelerating forward relative to
            the back line—pressing the defensive shape kinematically.
          </p>
        </Section>
      </main>
    </SiteLayout>
  )
}
