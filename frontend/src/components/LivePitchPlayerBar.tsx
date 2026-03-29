import { useEffect, useMemo } from "react";
import playerInfoJson from "@/data/playerInfoById.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLAYERS = playerInfoJson.playersById as Record<
  string,
  {
    name: { full_name: string; short_name: string };
    position: {
      position_group: string;
      role_name: string;
      role_acronym: string;
    };
    team: { acronym: string; short_name: string; name: string; side: string };
    match: { number: number };
    physical?: {
      distance?: number;
      minutes?: number;
      m_per_min?: number;
    };
  }
>;

const NONE_VALUE = " ";

function playerLabel(id: string): string {
  const p = PLAYERS[id];
  if (!p) return id;
  return `${p.name.short_name} · ${p.team.acronym} · #${p.match.number}`;
}

type LivePitchPlayerBarProps = {
  /** Player ids present in the current tracking frame (on the pitch). */
  pitchPlayerIds: readonly string[];
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  /** For guided tours (react-joyride). */
  dataTour?: string;
};

export function LivePitchPlayerBar({
  pitchPlayerIds,
  selectedId,
  onSelectedIdChange,
  dataTour,
}: LivePitchPlayerBarProps) {
  const sortedIds = useMemo(() => {
    const ids = pitchPlayerIds.filter((id) => id in PLAYERS);
    return ids.sort((a, b) => {
      const pa = PLAYERS[a]!;
      const pb = PLAYERS[b]!;
      const byTeam = pa.team.name.localeCompare(pb.team.name);
      if (byTeam !== 0) return byTeam;
      return pa.match.number - pb.match.number;
    });
  }, [pitchPlayerIds]);

  useEffect(() => {
    if (selectedId && !pitchPlayerIds.includes(selectedId)) {
      onSelectedIdChange(null);
    }
  }, [selectedId, pitchPlayerIds, onSelectedIdChange]);

  const info = selectedId ? PLAYERS[selectedId] : undefined;

  return (
    <div
      data-tour={dataTour}
      className="flex min-h-10 flex-col gap-2 border-b border-black/[0.06] px-3 pb-2.5 pt-1 sm:flex-row sm:items-center sm:gap-4 dark:border-white/[0.06]"
    >
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#86868b] dark:text-[#98989d]">
          Player
        </span>
        <Select
          value={selectedId ?? NONE_VALUE}
          onValueChange={(v) =>
            onSelectedIdChange(v === NONE_VALUE ? null : v)
          }
        >
          <SelectTrigger size="sm" className="min-w-40 max-w-56">
            <SelectValue placeholder="Select a player">
              {selectedId && PLAYERS[selectedId]
                ? playerLabel(selectedId)
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>— None —</SelectItem>
            {sortedIds.map((id) => (
              <SelectItem key={id} value={id}>
                {playerLabel(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {info ? (
        <div className="min-w-0 flex-1 text-[11px] leading-snug text-[#1d1d1f] dark:text-[#e8e8ed]">
          <span className="font-semibold">{info.name.full_name}</span>
          <span className="mx-1.5 text-[#86868b] dark:text-[#98989d]">·</span>
          <span>{info.team.acronym}</span>
          <span className="mx-1.5 text-[#86868b] dark:text-[#98989d]">·</span>
          <span>
            {info.position.role_name} ({info.position.role_acronym})
          </span>
          {info.physical ? (
            <>
              <span className="mx-1.5 text-[#86868b] dark:text-[#98989d]">
                ·
              </span>
              <span className="tabular-nums text-[#86868b] dark:text-[#a1a1a6]">
                {info.physical.distance != null && (
                  <>{Math.round(info.physical.distance)} m</>
                )}
                {info.physical.minutes != null && (
                  <>
                    {info.physical.distance != null ? " · " : null}
                    {info.physical.minutes.toFixed(1)} min
                  </>
                )}
                {info.physical.m_per_min != null && (
                  <> · {info.physical.m_per_min.toFixed(1)} m/min</>
                )}
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <p className="flex-1 text-[11px] text-[#86868b] dark:text-[#98989d]">
          Choose a player to see match and physical stats.
        </p>
      )}
    </div>
  );
}
