import { defineConfig } from 'vite';

// This config is used by vitest only. Production builds use `tsc` (see package.json `build` script).
// The `build.lib` block was removed because it was dead code — `pnpm build` runs `rm -rf dist && tsc`, not `vite build`.
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});