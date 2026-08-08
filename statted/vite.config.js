import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative so the build works under any sub-path
// (e.g. GitHub Pages at /statted/) as well as at a domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
})
