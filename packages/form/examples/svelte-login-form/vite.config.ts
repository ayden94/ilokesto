import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@ilokesto/form/svelte': resolve(__dirname, '../../src/svelte/index.ts'),
      '@ilokesto/form': resolve(__dirname, '../../src/index.ts'),
    },
  },
});