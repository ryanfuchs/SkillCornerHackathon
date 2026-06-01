import type { IndicatorMetricVariant } from '@/components/concept/IndicatorMetricMiniPitch'

export type IndicatorCatalogEntry = {
  id: string
  letter: string
  title: string
  accent: string
  metricVariant: IndicatorMetricVariant
  /** Full methodology-style copy for detail views */
  summary: string
  /** One line for hub list cards */
  listBlurb: string
  kind: 'core' | 'community'
  /** Display name for community plugins; core uses product name */
  author?: string
  version?: string
  /** Approximate hub download count for marketplace display */
  downloads: number
  tags?: string[]
}

/** Built-in MatchLab analyzers — same five as methodology. */
const CORE: IndicatorCatalogEntry[] = [
  {
    id: 'defensive_line',
    letter: 'A',
    title: 'Defensive line',
    accent: '#38bdf8',
    metricVariant: 'defensive_line',
    kind: 'core',
    author: 'Phasing',
    version: '1.2.0',
    downloads: 742,
    tags: ['shape', 'back line'],
    listBlurb: 'How exposed the deepest line looks from triangulated shape.',
    summary:
      'The triangulated shape picks out the deepest defensive line for either team. We read depth jaggedness and horizontal gaps from the spread of tactical coordinates, folding midfielders in when fewer than three defenders appear. A higher score describes a broken line and rest defense that looks exposed.',
  },
  {
    id: 'ball_chaos',
    letter: 'B',
    title: 'Ball Acceleration',
    accent: '#f97316',
    metricVariant: 'ball_chaos',
    kind: 'core',
    author: 'Phasing',
    version: '1.1.0',
    downloads: 811,
    tags: ['ball', 'tempo'],
    listBlurb: 'Tempo and direction change of the ball path each frame.',
    summary:
      'Height, speed, and how the path bends between frames all feed this score, including sharp turns, sudden bursts, and awkward bounces. Values near one highlight strong acceleration and goalward motion; values near zero describe calm, controlled circulation.',
  },
  {
    id: 'position_change',
    letter: 'C',
    title: 'Positional change',
    accent: '#22c55e',
    metricVariant: 'position_change',
    kind: 'core',
    author: 'Phasing',
    version: '1.0.3',
    downloads: 509,
    tags: ['movement', 'grid'],
    listBlurb: 'Grid movement across the side between consecutive frames.',
    summary:
      'Every player snaps to a discrete tactical grid each frame. We add the Euclidean grid distance for everyone who appears in two consecutive frames, then normalize the total into a zero to one range. A higher value means more of the side is shifting tactical slots at once—widespread, simultaneous movement that makes the shape feel more unsettled between frames.',
  },
  {
    id: 'line_to_line',
    letter: 'D',
    title: 'Line to line acceleration',
    accent: '#e11d48',
    metricVariant: 'line_to_line_acceleration',
    kind: 'core',
    author: 'Phasing',
    version: '1.3.0',
    downloads: 276,
    tags: ['lines', 'possession'],
    listBlurb: 'Forward acceleration of attack vs. retreating lines in possession.',
    summary:
      'While the team in possession has the ball we contrast its most advanced line with the deepest opposing line using mean forward acceleration from tenth of a second steps. A higher score means attackers are accelerating harder forward than the retreating defenders.',
  },
  {
    id: 'clusters',
    letter: 'E',
    title: 'Player clustering',
    accent: '#a855f7',
    metricVariant: 'player_clusters',
    kind: 'core',
    author: 'Phasing',
    version: '1.0.1',
    downloads: 633,
    tags: ['compactness', 'shape'],
    listBlurb: 'Compactness and size of the strongest spatial player cluster.',
    summary:
      'Nearby players are grouped into spatial clusters. Each cluster is scored by how large it is and how tightly its members sit together. The strongest cluster sets the final player clustering score.',
  },
]

/** Community-style plugins: wrappers and experiments mapped onto the same metric engine. */
const COMMUNITY: IndicatorCatalogEntry[] = [
  {
    id: 'plugin_pressing_index',
    letter: 'P',
    title: 'Pressing intensity index',
    accent: '#fb7185',
    metricVariant: 'ball_chaos',
    kind: 'community',
    author: 'ZSA Community',
    version: '0.4.3',
    downloads: 214,
    tags: ['pressing', 'experimental'],
    listBlurb: 'Ball acceleration re-weighted for gegenpress-style bursts.',
    summary:
      'Re-weights ball acceleration with a defensive-third mask and burst detection tuned for gegenpress moments. Uses the same underlying series as Ball Acceleration with a different normalization curve.',
  },
  {
    id: 'plugin_shape_flux',
    letter: 'S',
    title: 'Shape flux (rolling)',
    accent: '#34d399',
    metricVariant: 'position_change',
    kind: 'community',
    author: 'shape-lab',
    version: '0.9.1',
    downloads: 96,
    tags: ['movement', 'rolling window'],
    listBlurb: 'Smoothed positional churn to compare fatigue and subs.',
    summary:
      'Emphasizes frame-to-frame grid churn with a short rolling EMA so tactical oscillations show up as smoother flux. Good for comparing subs and late-game fatigue.',
  },
  {
    id: 'plugin_line_squeeze',
    letter: 'L',
    title: 'Line squeeze detector',
    accent: '#60a5fa',
    metricVariant: 'defensive_line',
    kind: 'community',
    author: 'backline.dev',
    version: '0.9.4',
    downloads: 58,
    tags: ['defensive line', 'transitions'],
    listBlurb: 'Defensive line stress focused on transition windows.',
    summary:
      'Projects the defensive line metric onto transition windows only, flagging when the deepest line compresses before a counter. Pairs with video review on fast breaks.',
  },
  {
    id: 'plugin_cluster_tightness',
    letter: 'K',
    title: 'Cluster tightness delta',
    accent: '#c084fc',
    metricVariant: 'player_clusters',
    kind: 'community',
    author: 'metric-garden',
    version: '0.2.1',
    downloads: 37,
    tags: ['compactness', 'set pieces'],
    listBlurb: 'Open play vs. dead-ball cluster contrast for block height.',
    summary:
      'Differences cluster scores between open play and dead-ball phases. Installs as an overlay on Player clustering for analysts comparing block height.',
  },
]

export const INDICATOR_CATALOG: IndicatorCatalogEntry[] = [...CORE, ...COMMUNITY]
