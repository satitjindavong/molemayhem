import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative so the build can be hosted from any subfolder.
export default defineConfig({
  base: './',
  plugins: [react()],
})
