import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PlaybackProvider } from '@/context/PlaybackContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlaybackProvider>
      <App />
    </PlaybackProvider>
  </StrictMode>,
)
