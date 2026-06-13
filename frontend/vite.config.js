import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In sviluppo locale: Vite gira su :5173 e proxya /api verso Express su :5000
      '/api': 'http://localhost:5000'
    }
  }
})