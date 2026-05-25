import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'react/index': 'src/react/index.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['@ilokesto/store', 'immer', 'react'],
    },
    sourcemap: false,
    emptyOutDir: false,
  },
});
