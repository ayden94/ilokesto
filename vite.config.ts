import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'react/index': 'src/react/index.ts',
        'vue/index': 'src/vue/index.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['@ilokesto/store', 'immer', 'react', 'vue'],
    },
    sourcemap: false,
    emptyOutDir: false,
  },
});
