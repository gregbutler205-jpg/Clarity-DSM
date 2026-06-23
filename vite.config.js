import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base ('./') so the built site works under the GitHub Pages project
// subpath (https://gregbutler205-jpg.github.io/clarity-dsm/) without hardcoding
// it, and still runs at the root during `npm run dev`.
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
