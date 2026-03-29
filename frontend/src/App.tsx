import { Navigate, Route, Routes } from 'react-router-dom'
import { ScrollToTop } from '@/components/ScrollToTop'
import { LandingPage } from '@/pages/LandingPage'
import { MatchLabPage } from '@/pages/MatchLabPage'
import { ConceptPage } from '@/pages/ConceptPage'
import { DataPipelinePage } from '@/pages/methodology/DataPipelinePage'
import { IndicatorsExplainedPage } from '@/pages/methodology/IndicatorsExplainedPage'

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/match-lab" element={<MatchLabPage />} />
      <Route path="/match" element={<Navigate to="/match-lab" replace />} />
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
    </>
  )
}

export default App
