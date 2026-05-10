import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // keep default behavior; Vite will pick an available port
    // set a fixed port if you prefer: port: 5175
  },
  css: {
    postcss: './postcss.config.js'
  }
})
