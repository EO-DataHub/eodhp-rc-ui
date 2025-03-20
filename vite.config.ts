import { defineConfig, loadEnv } from 'vite'

import path from 'path'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      svgr(),
      react(),
      {
        name: 'markdown-loader',
        transform(code, id) {
          if (id.endsWith('.md')) {
            // For .md files, get the raw content
            return `export default ${JSON.stringify(code)};`
          }
        },
      },
    ],
    base: `${env.VITE_BASE_PATH || '/'}`,
    build: {
      outDir: 'dist', // Output directory for build files
      assetsDir: 'assets', // Directory for static assets
      manifest: true, // Generate a manifest.json for hashed assets
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js', // Add hash to JS files
          chunkFileNames: 'assets/[name].[hash].js', // Add hash to chunk files
          assetFileNames: 'assets/[name].[hash].[ext]', // Add hash to other assets (CSS, images, etc.)
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        path: 'path-browserify',
        buffer: 'buffer/',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
        // Enable esbuild polyfill plugins
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true,
            process: true,
          }),
          NodeModulesPolyfillPlugin(),
        ],
      },
    },
  }
})
