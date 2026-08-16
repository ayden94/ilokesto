import { resolve } from 'node:path';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
  resolve: {
    alias: {
      '@ilokesto/form/react': resolve(__dirname, '../../src/react/index.ts'),
      '@ilokesto/form': resolve(__dirname, '../../src/index.ts'),
    },
  },
});