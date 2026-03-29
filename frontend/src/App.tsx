import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { MomentumChart } from '@/components/MomentumChart'
import { PhaseBreakdownChart } from '@/components/PhaseBreakdownChart'
import { PitchView } from '@/components/PitchView'
import { VideoPlayer } from '@/components/VideoPlayer'
import { useMatchTracking } from "@/hooks/useMatchTracking";

const matchData = {
  homeTeam: "SUI",
  awayTeam: "GER",
  homeScore: 3,
  awayScore: 4,
  competition: "Friendlies",
  date: "Mar 28, 2026",
};

const FLAG_CH_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Flag_of_Switzerland.svg/960px-Flag_of_Switzerland.svg.png";
const FLAG_DE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/1280px-Flag_of_Germany.svg.png";

function App() {
  const { players, ball, loadError, loaded, momentumTimeline } =
    useMatchTracking();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-8 pb-6 flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
          {matchData.competition} &mdash; {matchData.date}
        </p>
        <div className="flex items-center gap-7 mt-1.5">
          <div className="flex items-center gap-3">
            <img
              src={FLAG_CH_URL}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-md border border-border/85 bg-card object-cover [box-shadow:var(--shadow-card)]"
              loading="lazy"
              decoding="async"
            />
            <span className="text-6xl font-semibold tracking-tight text-foreground">
              {matchData.homeTeam}
            </span>
          </div>
          <span className="text-3xl font-light text-secondary tabular-nums">
            {matchData.homeScore}&nbsp;&ndash;&nbsp;{matchData.awayScore}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-6xl font-semibold tracking-tight text-foreground">
              {matchData.awayTeam}
            </span>
            <img
              src={FLAG_DE_URL}
              alt=""
              width={73}
              height={44}
              className="h-11 w-auto shrink-0 rounded-md border border-border/85 bg-card object-cover [box-shadow:var(--shadow-card)] aspect-[5/3]"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <MomentumChart timeline={momentumTimeline} />
      </header>

      <Separator className="opacity-80" />

      <main className="flex-1 min-h-0 px-8 pb-8 pt-6 grid grid-cols-3 gap-4 grid-rows-[1fr_1fr_auto]">
        <Card className="col-span-2 row-span-2 bg-card/84 flex flex-col min-h-0 gap-0 py-0">
          <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
            {loadError ? (
              <p className="px-4 pb-2 text-xs text-destructive">
                Failed to load tracking: {loadError}
              </p>
            ) : null}
            <PitchView
              players={loaded ? players : undefined}
              ballPosition={loaded ? ball : undefined}
            />
          </CardContent>
        </Card>

        <Card className="row-span-2 bg-card/84 flex flex-col min-h-0 gap-0 py-0">
          <CardContent className="flex-1 min-h-0 p-0">
            <VideoPlayer timeline={momentumTimeline} />
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card/84 flex flex-col min-h-0">
          <CardContent className="flex-1 min-h-0 p-0 pt-2 px-4 pb-4 w-full">
            <PhaseBreakdownChart />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;
