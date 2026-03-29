import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
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

        <Section title="Shape graphs">
          <p>
            In{" "}
            <a
              href="https://www.nature.com/articles/s44260-025-00047-x"
              className="font-medium text-[#0066cc] underline-offset-2 hover:underline dark:text-[#2997ff]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shape graphs and the instantaneous inference of tactical positions
              in soccer
            </a>{" "}
            (Brandes et al.,{" "}
            <em className="not-italic">npj Complexity</em>, 2025,{" "}
            <span className="whitespace-nowrap">doi:10.1038/s44260-025-00047-x</span>
            ), a <strong>shape graph</strong> is a graph{" "}
            <span className="whitespace-nowrap font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              G<sub>t</sub> = (V<sub>t</sub>, E<sub>t</sub>)
            </span>{" "}
            at discrete time index{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              t
            </span>
            . Vertices{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              V<sub>t</sub>
            </span>{" "}
            are outfield players; each carries a planar coordinate{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              p<sub>i</sub>(t) ∈ ℝ²
            </span>
            . Edges{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              E<sub>t</sub>
            </span>{" "}
            form a <strong>subgraph of the Delaunay triangulation</strong>{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              DT(V<sub>t</sub>)
            </span>
            : the maximal planar straight-line graph on{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              V<sub>t</sub>
            </span>{" "}
            in general position, uniquely characterised (up to degeneracy
            handling) by the <strong>empty circumcircle</strong> property—no site
            lies inside the circumdisk of any Delaunay triangle. Equivalently,{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              DT(V<sub>t</sub>)
            </span>{" "}
            is the dual graph of the Voronoi tessellation of{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              {"{p_i(t)}"}
            </span>
            , so adjacency encodes a notion of <strong>natural neighbours</strong>{" "}
            in the plane at that instant.
          </p>
          <p>
            The shape graph keeps a <strong>principled subset</strong> of Delaunay
            edges—still a combinatorial object on the same vertex set—so tactical
            structure is carried by{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              E<sub>t</sub> ⊆ E(DT(V<sub>t</sub>))
            </span>{" "}
            rather than the full triangulation. Operationally, each frame yields an
            independent planar graph; inference is{" "}
            <strong>instantaneous</strong> (
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              t ↦ G<sub>t</sub>
            </span>
            ) instead of first smoothing{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              {"{p_i(t)}"}
            </span>{" "}
            over a time window and then triangulating once. That raises temporal
            resolution and keeps the geometry tied to a single observation of the
            point set—useful whenever downstream scores must be explained frame by
            frame.
          </p>
          <p>
            Standard computational geometry builds{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              DT(V<sub>t</sub>)
            </span>{" "}
            in{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              O(n log n)
            </span>{" "}
            for{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              n = |V<sub>t</sub>|
            </span>{" "}
            in the plane. In this repository,{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              position_analysis.py
            </code>{" "}
            likewise lifts per-frame positions into a Delaunay complex (via{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              scipy.spatial.Delaunay
            </code>
            ) before tactical grid inference and related indicators—conceptually
            aligned with treating{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              G<sub>t</sub>
            </span>{" "}
            as the primary spatial carrier for each tick of tracking data.
          </p>
          <p>
            <strong>In this codebase,</strong>{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              frame_to_shape_graph
            </code>{" "}
            builds that carrier: start from the Delaunay edges, then prune with a
            priority queue using the angle-based tests described in the
            implementation (edges above a{" "}
            <span className="font-mono text-[15px] text-[#1d1d1f] dark:text-[#e8e8ed]">
              3π/4
            </span>{" "}
            combined-angle threshold are removed).{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              frame_to_positions
            </code>{" "}
            reads the resulting graph—internal faces, barycenters (including
            tilted bridging edges), and alternating horizontal / vertical split
            passes—and outputs a pair of small-integer tactical indices per
            player.{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              inferred_positions_for_frame
            </code>{" "}
            wraps that pipeline for a full tracking row and can memoize by bundle
            frame id so several analyzers share one shape-graph construction per
            instant.
          </p>
        </Section>

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
            <strong>Shape graph:</strong>{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              PositionChangeAnalyzer
            </code>{" "}
            uses{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              inferred_positions_for_frame
            </code>
            , so both frames get the same per-instant shape-graph → position-plot
            tactical indices. The score is the sum of Euclidean distances on that
            discrete grid over players present in both adjacent samples, scaled
            into <strong>[0, 1]</strong> by a fixed upper bound on total grid
            movement. A shared tactical-grid cache can be passed in from the
            phase exporter so position change and line-to-line acceleration do
            not rebuild the graph twice for the same frame.
          </p>
          <p>
            We divide that raw sum by a fixed ceiling and publish the result as
            a score from zero to one.{" "}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Higher
            </strong>{" "}
            values mean more players are jumping grid cells in the same step, so
            the team’s inferred shape is changing faster and across more of the
            pitch—tactical “noise” from coordinated repositioning rather than a
            stable picture.
          </p>
        </Section>

        <Section title="Ball Acceleration">
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
            aimed into the box, which is where high-acceleration attacking play
            usually shows up.
          </p>
        </Section>

        <Section title="Defensive line">
          <IndicatorMetricMiniPitch
            variant="defensive_line"
            className="max-w-[min(100%,280px)]"
          />
          <p>
            For each team, outfield players (goalkeepers excluded) are mapped with{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              frame_to_positions
            </code>
            —the same <strong>shape-graph → tactical grid</strong> pipeline as
            above, but run on that side’s point set only. We order tactical depth
            along the goal–goal axis (direction depends on average field position)
            and take the <strong>deepest tactical band</strong> as the back line,
            optionally merging with the next band if too few players appear there.{" "}
            <strong>Spacing</strong> and <strong>jaggedness</strong> are then
            computed from those players’ <strong>actual pitch coordinates in
            metres</strong> (standard deviation of gaps along the line and of
            depth), not from the integer grid cells themselves.
          </p>
          <p>
            Phase and possession metadata pick which team is attacking so the
            published master score reflects the <strong>defending</strong> side’s
            line quality for that instant.
          </p>
          <p>
            If too few outfielders are tracked or the tactical mapping throws, that
            team’s line scores fall back to zero.{" "}
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
            <strong>Shape graph:</strong>{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
              inferred_positions_for_frame
            </code>{" "}
            assigns each player a tactical grid cell; the{" "}
            <strong>most advanced</strong> band among possession-team outfielders
            and the <strong>deepest</strong> band among opponents define the two
            lines. <strong>Acceleration</strong> itself uses three consecutive
            tracking samples at <strong>0.1 s</strong> spacing on each line
            member’s <strong>raw (x, y)</strong> coordinates—second differences in
            metres per second squared—then compares mean magnitude on the forward
            line versus the back line. The tactical grid is only for{" "}
            <strong>who</strong> belongs to each line; kinematics stay in world
            space.
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

        <section className="mt-14 border-t border-black/[0.06] pt-12 dark:border-white/[0.08]">
          <p className="text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            To rebuild the JSON the dashboard loads from SkillCorner exports, see{" "}
            <Link
              to="/methodology/data-pipeline"
              className="font-medium text-[#0066cc] underline-offset-2 hover:underline dark:text-[#2997ff]"
            >
              Data pipeline
            </Link>
            .
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
