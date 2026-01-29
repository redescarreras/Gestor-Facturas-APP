import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Esto es vital para que GitHub Pages encuentre tus archivos
  base: '/Gestor-Facturas-APP/',
  build: {
    outDir: 'dist',
  }
})