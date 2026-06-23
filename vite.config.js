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
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    __GIT_COMMIT_HASH__: JSON.stringify(process.env.GIT_COMMIT_HASH || 'unknown'),
  },
  build: {
    // Generate hidden source maps for error tracking (not exposed to users)
    sourcemap: 'hidden',
    // Inline assets smaller than 4kb as base64
    assetsInlineLimit: 4096,
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    // Terser minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    // Module preload configuration
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-is')) {
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
