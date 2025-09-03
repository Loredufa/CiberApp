// vite.config.js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nist': {
        target: 'https://n8n-n8n.apps.focus-ocp-sno-virt.datco.net',
        changeOrigin: true,
        secure: false, // acepta el cert no confiable EN DEV
        rewrite: p => p.replace(/^\/api\/nist/, '/webhook/nist-csf'),
      },
      '/api/pentest': {
        target: 'https://n8n-n8n.apps.focus-ocp-sno-virt.datco.net',
        changeOrigin: true,
        secure: false,
        rewrite: p => p.replace(/^\/api\/pentest/, '/webhook/pentest'),
      },
    },
  },
})

