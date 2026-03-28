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
    <div className="min-h-screen flex flex-col">
      <header className="py-8 px-8 flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
          {matchData.competition} &mdash; {matchData.date}
        </p>
        <div className="flex items-center gap-6 mt-2">
          <span className="text-6xl font-bold tracking-tight">{matchData.homeTeam}</span>
          <span className="text-3xl font-light text-muted-foreground tabular-nums">
            {matchData.homeScore}&nbsp;&ndash;&nbsp;{matchData.awayScore}
          </span>
          <span className="text-6xl font-bold tracking-tight">{matchData.awayTeam}</span>
        </div>
        <MomentumChart />
      </header>

      <Separator />

      <main className="flex-1 p-8 grid grid-cols-3 gap-4 auto-rows-min">
        <Card className="col-span-2 row-span-2 bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Pitch Visualization</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground/30 text-sm">
            pitch coming soon
          </CardContent>
        </Card>

        <Card className="bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-32 text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>

        <Card className="bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Video Player</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-32 text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Phase Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground/30 text-sm">
            coming soon
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
