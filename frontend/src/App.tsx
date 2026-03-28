import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MomentumChart } from '@/components/MomentumChart'
import { PhaseBreakdownChart } from '@/components/PhaseBreakdownChart'

const matchData = {
  homeTeam: 'SUI',
  awayTeam: 'GER',
  homeScore: 3,
  awayScore: 4,
  competition: 'Friendlies',
  date: 'Mar 28, 2026',
}

function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex shrink-0 flex-col items-center gap-2 px-8 pb-3 pt-4">
        <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
          {matchData.competition} &mdash; {matchData.date}
        </p>
        <div className="flex items-center gap-6 mt-1">
          <span className="text-6xl font-bold tracking-tight">{matchData.homeTeam}</span>
          <span className="text-3xl font-light text-muted-foreground tabular-nums">
            {matchData.homeScore}&nbsp;&ndash;&nbsp;{matchData.awayScore}
          </span>
          <span className="text-6xl font-bold tracking-tight">{matchData.awayTeam}</span>
        </div>
        <MomentumChart />
      </header>

      <Separator className="shrink-0" />

      <main className="grid flex-1 grid-cols-1 gap-4 p-6 pb-12 md:grid-cols-3 md:grid-rows-[auto_auto] md:[grid-template-columns:minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="bg-transparent md:col-span-2 md:row-span-2 md:min-h-[min(60vh,32rem)]">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pitch Visualization</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[12rem] flex-1 items-center justify-center text-muted-foreground/30 text-sm md:min-h-[min(50vh,28rem)]">
            pitch coming soon
          </CardContent>
        </Card>

        <Card className="bg-transparent md:min-h-[10rem]">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[8rem] flex-1 items-center justify-center text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>

        <Card className="bg-transparent md:min-h-[10rem]">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Video Player</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[8rem] flex-1 items-center justify-center text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>

        <Card className="bg-transparent md:col-span-3">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Phase Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-4 pt-0">
            <PhaseBreakdownChart />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
