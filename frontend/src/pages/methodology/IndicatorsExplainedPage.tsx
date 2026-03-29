import type { ReactNode } from 'react'
import { IndicatorMetricMiniPitch } from '@/components/concept/IndicatorMetricMiniPitch'
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
          These definitions match the Python analyzers under{" "}
          <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
            analysis/
          </code>
          . Each analyzer writes one score per frame on a scale from zero to
          one. The phase chart reads those values from the exported JSON.
        </p>

        <Section title="Player clusters">
          <IndicatorMetricMiniPitch
            variant="player_clusters"
            className="max-w-[min(100%,280px)]"
          />
          <p>
            Nearby players are grouped into spatial clusters. Each cluster is
            scored by how large it is and how tightly its members sit together.
            The strongest cluster sets the final player clustering score for
            that frame.
          </p>
          <p>
            The analyzer writes one value per frame from zero to one. A short
            running average over recent frames smooths the trace for the
            timeline, and the app keeps the winning cluster's player ids for
            pitch overlays.
          </p>
          <p>
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{" "}
            values mean the most compact cluster is both sizable (it covers a
            meaningful share of the outfield) and dense (its members sit close
            to one another).
          </p>
        </Section>

        <Section title="Position change">
          <IndicatorMetricMiniPitch
            variant="position_change"
            className="max-w-[min(100%,280px)]"
          />
          <p>
            Players land on a discrete tactical grid of inferred positions in
            the current frame and again in the previous frame. For every player
            visible in both snapshots we add the Euclidean distance between the
            two grid cells, which behaves like counting total steps across the
            squad.
          </p>
          <p>
            We divide that raw sum by a fixed ceiling and publish the result as
            a score from zero to one.{" "}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{" "}
            values mean the group moved more collectively from one frame to the
            next.
          </p>
        </Section>

        <Section title="Ball chaos">
          <IndicatorMetricMiniPitch
            variant="ball_chaos"
            className="max-w-[min(100%,280px)]"
          />
          <p>
            When the ball is detected we blend four ingredients. Height matters
            up to a cap of three metres. Distance to the nearest goal raises the
            score when play creeps into dangerous territory. Speed comes from
            differences between consecutive samples at ten hertz, expressed in
            metres per second and scaled toward a ceiling near eighty kilometres
            per hour. A direction term rewards velocity that points toward goal,
            similar to a cosine between motion and the goalward vector.
          </p>
          <p>
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{" "}
            values highlight stretches that feel fast, aerial, close to goal, or
            aimed into the box, which is where chaotic attacking play usually
            shows up.
          </p>
        </Section>

        <Section title="Defensive line">
          <IndicatorMetricMiniPitch
            variant="defensive_line"
            className="max-w-[min(100%,280px)]"
          />
          <p>
            Whenever we know who has the ball, the defending outfield players
            sit on a tactical shape graph. The metric studies the deepest line
            in tactical depth bands and measures how even the spacing is and how
            smooth the line looks in depth.
          </p>
          <p>
            Missing possession or shape inference forces the score to zero.{" "}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{" "}
            values describe a defensive line that looks more orderly under the
            geometry we encode in the model.
          </p>
        </Section>

        <Section title="Line to line acceleration">
          <IndicatorMetricMiniPitch
            variant="line_to_line_acceleration"
            className="max-w-[min(100%,280px)]"
          />
          <p>
            For the team in possession we take the most advanced tactical line
            of outfielders and compare it with the deepest line on the defending
            side. Accelerations come from positional change in steps of one
            tenth of a second. We compare mean forward acceleration on the
            attacking line with the same quantity on the defensive line, then
            map the gap onto a scale from zero to one using a fixed offset and
            gain.
          </p>
          <p>
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{" "}
            values mean the attack is surging forward faster than the back line
            is responding, which is the kinematic signature of pressing space
            behind the defense.
          </p>
        </Section>
      </main>
    </SiteLayout>
  );
}
