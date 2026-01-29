import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Nombre exacto de tu repositorio entre barras
  base: '/Gestor-Facturas-APP/',
})