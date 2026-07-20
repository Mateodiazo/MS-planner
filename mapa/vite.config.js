import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/mapas/',   // el mapa se sirve bajo msplanner.org/mapas/ → assets desde /mapas/assets/
})
