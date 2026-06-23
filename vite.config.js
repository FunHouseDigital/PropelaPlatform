import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-recharts'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide'
          }
          if (id.includes('node_modules/@dnd-kit')) {
            return 'vendor-dnd'
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router'
          }
        },
      },
    },
  },
})
