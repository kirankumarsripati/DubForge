import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@dubforge/shared',
          '@dubforge/pipeline',
          '@dubforge/providers',
          '@dubforge/job-config',
          '@dubforge/types',
        ],
      }),
    ],
    resolve: {
      alias: {
        '@dubforge/shared': resolve(__dirname, '../../packages/shared/src'),
        '@dubforge/pipeline': resolve(__dirname, '../../packages/pipeline/src'),
        '@dubforge/providers': resolve(__dirname, '../../packages/providers/src'),
        '@dubforge/job-config': resolve(__dirname, '../../packages/job-config/src'),
        '@dubforge/types': resolve(__dirname, '../../packages/types/src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
        output: {
          format: 'cjs',
        },
      },
    },
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@dubforge/shared'],
      }),
    ],
    resolve: {
      alias: {
        '@dubforge/shared': resolve(__dirname, '../../packages/shared/src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@dubforge/job-config': resolve(__dirname, '../../packages/job-config/src'),
        '@dubforge/shared': resolve(__dirname, '../../packages/shared/src'),
        '@dubforge/ui': resolve(__dirname, '../../packages/ui/src'),
      },
    },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
  },
});
