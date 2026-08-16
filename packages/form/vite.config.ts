import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// This config is used by vitest only. Production builds use `tsc` (see package.json `build` script).
// The `build.lib` block was removed because it was dead code — `pnpm build` runs `rm -rf dist && tsc`, not `vite build`.
export default defineConfig({
  plugins: [svelte()],
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
  },
});
