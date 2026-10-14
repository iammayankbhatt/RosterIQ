import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // one bundle on purpose: no lazy-loading flicker in the middle of a live demo (about 225 kB gzipped)
  build: { chunkSizeWarningLimit: 900 },
  test: { environment: 'node' },
})
