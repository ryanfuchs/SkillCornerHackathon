import type { ReactNode } from 'react'
import { SiteLayout } from '@/components/layout/SiteLayout'

function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[720px] px-6 pb-24 pt-12 sm:pt-16">
      {children}
    </div>
  )
}

export function TimelineExplainedPage() {
  return (
    <SiteLayout marketing>
      <main>
        <Prose>
          <h1 className="text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[44px] dark:text-[#f5f5f7]">
            Timeline &amp; sync
          </h1>
          <p className="mt-5 text-[19px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
            The app loads extrapolated tracking at 10&nbsp;Hz (one row every
            0.1&nbsp;s). Timestamps on each row are parsed as broadcast clock
            time and converted to continuous match minutes for display and
            seeking.
          </p>

          <h2 className="mt-14 text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Match timeline
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            The horizontal bar reuses the zero to one mapping from earlier builds.
            Only live minutes from period one and period two appear, with halftime
            collapsed to a thin seam. Kickoff sits on the left edge and full time
            on the right.
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            Dots mark{' '}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              key moments
            </strong>{' '}
            parsed from{' '}
            <code className="rounded bg-black/[0.05] px-1 text-[15px] dark:bg-white/10">
              2060235_dynamic_events.csv
            </code>
            . Goals come from merged <code className="text-[15px]">lead_to_goal</code>{' '}
            clusters and shots from merged{' '}
            <code className="text-[15px]">lead_to_shot</code> clusters. Click or
            drag the track to seek and the playhead stays glued to the broadcast
            clock together with the video.
          </p>

          <h2 className="mt-14 text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Phase breakdown chart
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            Phase boundaries come from exported match phases (start/end bundle
            frames). For each phase, the chart shows indicator series over a{' '}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              moving window
            </strong>{' '}
            of frames (150 frames in the current build) so you see local
            variation, not only phase-level averages.
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            Points may be{' '}
            <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              strided
            </strong>{' '}
            so only every Nth frame renders, which keeps the chart responsive.
            Hovering still snaps to the nearest real frame so playback stays
            truthful.
          </p>

          <h2 className="mt-14 text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Pitch coordinates
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            Tracking follows SkillCorner style field axes. The three dimensional
            pitch view swaps coordinates so <em>x</em> runs across the pitch and{' '}
            <em>y</em> runs along it, which mirrors what you see in the viewer.
          </p>
        </Prose>
      </main>
    </SiteLayout>
  )
}
