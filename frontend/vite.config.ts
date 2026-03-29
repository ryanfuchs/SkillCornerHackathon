import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Recharts imports react-is; ensure it is pre-bundled so dev import analysis resolves it.
    // react-joyride imports named exports from `react`; forcing react/react-dom into the
    // pre-bundle avoids a broken `/node_modules/.vite/deps/react.js` (missing cloneElement).
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-is',
      'recharts',
      'react-joyride',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
