import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MomentumChart } from '@/components/MomentumChart'

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
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

      <main className="grid min-h-0 flex-1 grid-cols-3 gap-4 overflow-hidden p-6 [grid-template-rows:minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.42fr)]">
        <Card className="col-span-2 row-span-2 h-full min-h-0 bg-transparent">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pitch Visualization</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground/30 text-sm">
            pitch coming soon
          </CardContent>
        </Card>

        <Card className="h-full min-h-0 bg-transparent">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>

        <Card className="h-full min-h-0 bg-transparent">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Video Player</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>

        <Card className="col-span-3 h-full min-h-0 bg-transparent">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Phase Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
