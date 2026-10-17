import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const entry = mode === 'content'
    ? resolve(root, 'src/content/index.ts')
    : mode === 'background'
      ? resolve(root, 'src/background/index.ts')
      : resolve(root, 'gallery.html');
  const standalone = mode !== 'gallery';

  return {
    base: './',
    plugins: mode === 'gallery' ? [react()] : [],
    publicDir: mode === 'content' ? 'public' : false,
    build: {
      outDir: 'dist',
      emptyOutDir: mode === 'content',
      rollupOptions: {
        input: entry,
        output: {
          entryFileNames: `assets/${mode}.js`,
          ...(standalone ? { inlineDynamicImports: true } : {}),
        },
      },
    },
  };
});
