import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { MatchDashboardPage } from '@/pages/MatchDashboardPage'
import { MethodologyHubPage } from '@/pages/methodology/MethodologyHubPage'
import { TimelineExplainedPage } from '@/pages/methodology/TimelineExplainedPage'
import { IndicatorsExplainedPage } from '@/pages/methodology/IndicatorsExplainedPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/match" element={<MatchDashboardPage />} />
      <Route path="/methodology" element={<MethodologyHubPage />} />
      <Route path="/methodology/timeline" element={<TimelineExplainedPage />} />
      <Route
        path="/methodology/indicators"
        element={<IndicatorsExplainedPage />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
