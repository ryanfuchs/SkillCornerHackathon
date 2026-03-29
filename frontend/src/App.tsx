import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { MatchDashboardPage } from '@/pages/MatchDashboardPage'
import { ConceptPage } from '@/pages/ConceptPage'
import { DataPipelinePage } from '@/pages/methodology/DataPipelinePage'
import { IndicatorsExplainedPage } from '@/pages/methodology/IndicatorsExplainedPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/match" element={<MatchDashboardPage />} />
      <Route path="/methodology" element={<ConceptPage />} />
      <Route
        path="/methodology/data-pipeline"
        element={<DataPipelinePage />}
      />
      <Route
        path="/methodology/timeline"
        element={<Navigate to="/methodology/data-pipeline" replace />}
      />
      <Route
        path="/methodology/indicators"
        element={<IndicatorsExplainedPage />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
