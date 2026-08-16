import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@ilokesto/form/vue': resolve(__dirname, '../../src/vue/index.ts'),
      '@ilokesto/form': resolve(__dirname, '../../src/index.ts'),
    },
  },
});