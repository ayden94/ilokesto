import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.ts',
    'solid/index': 'src/solid/index.ts',
    'svelte/index': 'src/svelte/index.ts',
    'vue/index': 'src/vue/index.ts',
  },
  external: [
    '@ilokesto/store',
    'immer',
    'react',
    'solid-js',
    'svelte',
    'svelte/action',
    'svelte/store',
    'vue',
  ],
  format: ['esm'],
  outDir: 'dist',
  sourcemap: true,
  splitting: true,
  target: 'es2022',
  treeshake: true,
});
