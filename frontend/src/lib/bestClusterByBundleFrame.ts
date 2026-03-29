import phaseBreakdownFrames from '@/data/phaseBreakdownFrames.json'

type FramesPayload = {
  trackingFrameIds: number[]
  frameSeriesLength: number
  player_clusters_best_player_ids?: number[][]
}

let mapCache: Map<number, number[]> | null = null

function bundleFrameToBestClusterIds(): Map<number, number[]> {
  if (mapCache) return mapCache
  const f = phaseBreakdownFrames as FramesPayload
  const ids = f.trackingFrameIds
  const bests = f.player_clusters_best_player_ids ?? []
  const n = Math.min(
    ids.length,
    f.frameSeriesLength,
    bests.length,
  )
  const m = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    m.set(ids[i]!, bests[i] ?? [])
  }
  mapCache = m
  return mapCache
}

/** SkillCorner player ids in the best cluster for this bundle frame (empty if unknown / no cluster). */
export function bestClusterIdsForBundleFrame(bundleFrame: number): number[] {
  return bundleFrameToBestClusterIds().get(bundleFrame) ?? []
}
