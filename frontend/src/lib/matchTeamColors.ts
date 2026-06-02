/** Switzerland (home) and Germany (away) — pitch, timeline dots, etc. */
export const SUI_MATCH_COLOR = '#e30613'
export const GER_MATCH_COLOR = '#0b4f9c'

/** Parse dynamic-events style labels: `… (Switzerland)` / `… (Germany)`. */
export function matchColorFromLabel(label: string): string | null {
  if (label.includes('(Switzerland)')) return SUI_MATCH_COLOR
  if (label.includes('(Germany)')) return GER_MATCH_COLOR
  return null
}
