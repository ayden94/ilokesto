import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@ilokesto/form/solid': resolve(__dirname, '../../src/solid/index.ts'),
      '@ilokesto/form': resolve(__dirname, '../../src/index.ts'),
    },
  },
});