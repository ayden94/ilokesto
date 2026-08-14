import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['react', 'react-dom'],
  noExternal: ['@ilokesto/overlay', '@ilokesto/store'],
  outExtension: () => ({ js: '.js' }),
});
