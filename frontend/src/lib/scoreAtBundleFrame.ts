import scoreData from '@/data/scoreBreakpoints.json'

type Breakpoint = { frame: number; home: number; away: number }

const breakpoints = (scoreData as { breakpoints: Breakpoint[] }).breakpoints

/** Last score state at or before `bundleFrame` (SkillCorner bundle frame id). */
export function scoreAtBundleFrame(bundleFrame: number): {
  home: number
  away: number
} {
  if (breakpoints.length === 0) return { home: 0, away: 0 }
  let lo = 0
  let hi = breakpoints.length - 1
  let best = breakpoints[0]!
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const b = breakpoints[mid]!
    if (b.frame <= bundleFrame) {
      best = b
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return { home: best.home, away: best.away }
}
