import { defineConfig, loadEnv } from 'vite'

import path from 'path'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import legacyPolyfills from '@vitejs/plugin-legacy'
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
      legacyPolyfills({
        targets: ['defaults'],
      }),
    ],
    base: `${env.VITE_BASE_PATH || '/'}`,
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
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
          }),
          NodeModulesPolyfillPlugin(),
        ],
      },
    },
  }
})
