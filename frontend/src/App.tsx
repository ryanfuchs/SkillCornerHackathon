import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <header className="py-8 px-8 flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
          {matchData.competition} &mdash; {matchData.date}
        </p>
        <div className="flex items-center gap-6 mt-2">
          <div className="flex items-center gap-3">
            <img
              src={FLAG_CH_URL}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-sm border border-white object-cover shadow-sm"
              loading="lazy"
              decoding="async"
            />
            <span className="text-6xl font-bold tracking-tight">
              {matchData.homeTeam}
            </span>
          </div>
          <span className="text-3xl font-light text-muted-foreground tabular-nums">
            {matchData.homeScore}&nbsp;&ndash;&nbsp;{matchData.awayScore}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-6xl font-bold tracking-tight">
              {matchData.awayTeam}
            </span>
            <img
              src={FLAG_DE_URL}
              alt=""
              width={73}
              height={44}
              className="h-11 w-auto shrink-0 rounded-sm border border-white object-cover shadow-sm aspect-[5/3]"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <MomentumChart timeline={momentumTimeline} />
      </header>

      <Separator />

      <main className="flex-1 min-h-0 p-8 grid grid-cols-3 gap-4 grid-rows-[1fr_1fr_auto]">
        <Card className="col-span-2 row-span-2 bg-transparent flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pitch Visualization
              {loadError ? (
                <span className="ml-2 text-destructive font-normal">
                  (failed to load tracking: {loadError})
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 pt-2 flex flex-col">
            <PitchView
              players={loaded ? players : undefined}
              ballPosition={loaded ? ball : undefined}
            />
          </CardContent>
        </Card>

        <Card className="row-span-2 bg-transparent flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Video Player
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-3">
            <VideoPlayer timeline={momentumTimeline} />
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-transparent flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Phase Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 pt-2 px-4 pb-4 w-full">
            <PhaseBreakdownChart />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;
