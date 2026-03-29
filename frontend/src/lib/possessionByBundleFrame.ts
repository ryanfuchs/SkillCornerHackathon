import matchJson from '@/data/2060235_match.json'
import phaseBreakdownPhases from '@/data/phaseBreakdownPhases.json'
import {
  GER_MATCH_COLOR,
  SUI_MATCH_COLOR,
} from '@/lib/matchTeamColors'

type PhaseRow = {
  bundleStart: number | null
  bundleEnd: number | null
  phaseOfPlay?: Record<string, unknown> | null
}

type PhasesFile = {
  phases: PhaseRow[]
  nFrames?: number
}

const phasesData = phaseBreakdownPhases as PhasesFile
const match = matchJson as {
  home_team: { id: number }
  away_team: { id: number }
}

export const POSSESSION_HOME_TEAM_ID = match.home_team.id
export const POSSESSION_AWAY_TEAM_ID = match.away_team.id

/**
 * For each bundle frame index (playback / tracking row), SkillCorner team id
 * in possession while that frame lies inside a phase interval; gaps carry
 * forward the last known id; before the first phase, -1 (unknown).
 */
export function buildPossessionTeamIdByFrame(maxFrame: number): Int32Array {
  const out = new Int32Array(Math.max(0, maxFrame)).fill(-1)
  if (maxFrame <= 0) return out

  const intervals = phasesData.phases
    .map((p) => {
      const lo = p.bundleStart
      const hi = p.bundleEnd
      if (lo == null || hi == null) return null
      const row = p.phaseOfPlay
      const tid = row?.team_in_possession_id
      if (typeof tid !== 'number' || !Number.isFinite(tid)) return null
      return { lo, hi, tid }
    })
    .filter((x): x is { lo: number; hi: number; tid: number } => x != null)
    .sort((a, b) => a.lo - b.lo)

  let phaseIdx = 0
  let carried = -1

  for (let f = 0; f < maxFrame; f++) {
    while (
      phaseIdx < intervals.length &&
      intervals[phaseIdx]!.hi < f
    ) {
      phaseIdx++
    }
    const cur = intervals[phaseIdx]
    if (
      cur != null &&
      cur.lo <= f &&
      f <= cur.hi
    ) {
      carried = cur.tid
    }
    out[f] = carried
  }

  return out
}

/** Dot / accent color for radar vertices from possessing team id. */
export function possessionAccentColor(teamId: number): string {
  if (teamId === POSSESSION_HOME_TEAM_ID) return SUI_MATCH_COLOR
  if (teamId === POSSESSION_AWAY_TEAM_ID) return GER_MATCH_COLOR
  return '#86868b'
}
