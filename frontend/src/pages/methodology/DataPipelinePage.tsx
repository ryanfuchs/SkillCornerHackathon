import { Link } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'

export function DataPipelinePage() {
  return (
    <SiteLayout marketing>
      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-12 sm:pt-16">
        <p className="text-[15px] font-medium text-[#86868b] dark:text-[#98989d]">
          <Link
            to="/methodology"
            className="text-[#0066cc] hover:underline dark:text-[#2997ff]"
          >
            ← Concept
          </Link>
          <span className="mx-2 opacity-40" aria-hidden>
            ·
          </span>
          <Link
            to="/methodology/indicators"
            className="text-[#0066cc] hover:underline dark:text-[#2997ff]"
          >
            Indicator calculations
          </Link>
        </p>
        <h1 className="mt-4 text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[44px] dark:text-[#f5f5f7]">
          Data pipeline
        </h1>
        <p className="mt-5 text-[19px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
          The match dashboard reads precomputed JSON under{" "}
          <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
            frontend/src/data/
          </code>
          . The scripts in{" "}
          <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
            pipeline/
          </code>{" "}
          regenerate those files from SkillCorner-style exports next to your{" "}
          <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
            *_match.json
          </code>
          .
        </p>

        <section className="mt-14 border-t border-black/[0.06] pt-12 dark:border-white/[0.08]">
          <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Inputs in <code className="text-[0.92em]">data/</code>
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            Put exports in the repository{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] dark:bg-white/10">
              data/
            </code>{" "}
            folder, all sharing the same match id prefix (example{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] dark:bg-white/10">
              2060235
            </code>
            ):
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            <li>
              <code className="text-[15px]">{`{id}_match.json`}</code> — match
              metadata and lineups
            </li>
            <li>
              <code className="text-[15px]">{`{id}_tracking_extrapolated.jsonl`}</code>{" "}
              — 10 Hz frames (used by phase export and the in-browser JSONL)
            </li>
            <li>
              <code className="text-[15px]">{`{id}_physical_data.csv`}</code> — per
              player physical summary (player mapping)
            </li>
            <li>
              <code className="text-[15px]">{`{id}_phases_of_play.csv`}</code> — phase
              windows (phase breakdown)
            </li>
            <li>
              <code className="text-[15px]">{`{id}_dynamic_events.csv`}</code> —
              dynamic events (phase bundle also loads this from{" "}
              <code className="text-[15px]">data/</code>)
            </li>
          </ul>
          <p className="mt-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            The timeline extractor expects a copy of{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] dark:bg-white/10">
              {`{id}_dynamic_events.csv`}
            </code>{" "}
            at{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] dark:bg-white/10">
              frontend/src/data/2060235_dynamic_events.csv
            </code>{" "}
            (adjust the filename if you change match id). Copy from{" "}
            <code className="text-[15px]">data/</code> when you refresh events.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            The Vite app imports tracking from{" "}
            <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[15px] dark:bg-white/10">
              frontend/src/data/*_tracking_extrapolated.jsonl
            </code>
            . Keep that file in sync with analysis (it can mirror{" "}
            <code className="text-[15px]">data/</code> or be the canonical copy).
          </p>
        </section>

        <section className="mt-14 border-t border-black/[0.06] pt-12 dark:border-white/[0.08]">
          <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            One command
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            From the <strong>repository root</strong>, with dependencies installed
            (e.g. <code className="text-[15px]">uv sync</code>):
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-black/[0.08] bg-black/[0.04] p-4 text-[14px] leading-relaxed text-[#1d1d1f] dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-[#e8e8ed]">
            uv run python pipeline/run_all.py
          </pre>
          <p className="mt-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            That runs, in order:
          </p>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            <li>
              <code className="text-[15px]">export_player_mapping.py</code> →{" "}
              <code className="text-[15px]">playerInfoById.json</code>
            </li>
            <li>
              <code className="text-[15px]">extract_timeline_moments.py</code> →{" "}
              <code className="text-[15px]">timelineKeyMoments.json</code>,{" "}
              <code className="text-[15px]">scoreBreakpoints.json</code>
            </li>
            <li>
              <code className="text-[15px]">export_phase_breakdown.py</code> →{" "}
              <code className="text-[15px]">phaseBreakdownPhases.json</code>,{" "}
              <code className="text-[15px]">phaseBreakdownFrames.json</code> (full
              bundle scan; slow)
            </li>
          </ol>
        </section>

        <section className="mt-14 border-t border-black/[0.06] pt-12 dark:border-white/[0.08]">
          <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Useful options
          </h2>
          <ul className="mt-4 space-y-4 text-[17px] leading-relaxed text-[#424245] dark:text-[#d2d2d7]">
            <li>
              Skip the heavy phase export while iterating on mapping or timeline:
              <pre className="mt-2 overflow-x-auto rounded-xl border border-black/[0.08] bg-black/[0.04] p-4 text-[14px] dark:border-white/[0.1] dark:bg-white/[0.06]">
                uv run python pipeline/run_all.py --skip-phases
              </pre>
            </li>
            <li>
              Point at another match bundle (passed to mapping + phase steps):
              <pre className="mt-2 overflow-x-auto rounded-xl border border-black/[0.08] bg-black/[0.04] p-4 text-[14px] dark:border-white/[0.1] dark:bg-white/[0.06]">
                uv run python pipeline/run_all.py --match-json
                data/your_id_match.json
              </pre>
            </li>
            <li>
              Forward flags only to{" "}
              <code className="text-[15px]">export_phase_breakdown.py</code> after{" "}
              <code className="text-[15px]">--</code>, for example:
              <pre className="mt-2 overflow-x-auto rounded-xl border border-black/[0.08] bg-black/[0.04] p-4 text-[14px] dark:border-white/[0.1] dark:bg-white/[0.06]">
                uv run python pipeline/run_all.py -- --max-phases 10 --start-phase
                0
              </pre>
            </li>
          </ul>
        </section>

        <section className="mt-14 border-t border-black/[0.06] pt-12 dark:border-white/[0.08]">
          <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Run steps individually
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-black/[0.08] bg-black/[0.04] p-4 text-[14px] leading-relaxed text-[#1d1d1f] dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-[#e8e8ed]">
            {`uv run python pipeline/export_player_mapping.py
uv run python pipeline/extract_timeline_moments.py
uv run python pipeline/export_phase_breakdown.py`}
          </pre>
        </section>
      </main>
    </SiteLayout>
  )
}
